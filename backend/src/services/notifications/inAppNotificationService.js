import mongoose from 'mongoose';
import NotificationEvent from '../../models/NotificationEvent.js';
import { AppError } from '../../errors/AppError.js';
import { publishNotificationCreated } from '../../realtime/publisher.js';

const ADMIN_ROLES = new Set(['owner', 'admin']);
const ADMIN_ONLY_NOTIFICATION_TYPES = Object.freeze([
  'employee_signup_request',
  'employee_signup_approved',
  'employee_signup_declined',
  'employee_signin',
  'employee_signout'
]);

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
};

const toPositiveInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const resolveWarehouseId = ({ warehouseId = null, metadata = {} }) => {
  const explicitWarehouseId = toObjectId(warehouseId);
  if (explicitWarehouseId) return explicitWarehouseId;

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return (
    toObjectId(metadata.warehouseId) ||
    toObjectId(metadata.warehouse) ||
    toObjectId(metadata.warehouse?._id) ||
    null
  );
};

const isAdminRole = (userRole) =>
  ADMIN_ROLES.has(
    String(userRole || '')
      .trim()
      .toLowerCase()
  );

const mapWarehouseScope = (warehouse) => {
  if (!warehouse) {
    return {
      warehouseId: null,
      warehouseCode: null,
      warehouseName: null
    };
  }

  if (
    typeof warehouse === 'object' &&
    !Array.isArray(warehouse) &&
    warehouse !== null
  ) {
    return {
      warehouseId: warehouse._id ? String(warehouse._id) : null,
      warehouseCode: warehouse.code || null,
      warehouseName: warehouse.name || null
    };
  }

  return {
    warehouseId: String(warehouse),
    warehouseCode: null,
    warehouseName: null
  };
};

const applyRoleScopeToQuery = ({ query, userRole }) => {
  if (isAdminRole(userRole)) return query;
  return {
    ...query,
    type: {
      $nin: ADMIN_ONLY_NOTIFICATION_TYPES
    }
  };
};

const mapNotification = (notification, userId = null) => {
  if (!notification) return null;
  const normalizedUserId = String(userId || '').trim();
  const readEntry = (notification.readBy || []).find(
    (entry) => String(entry?.user || '') === normalizedUserId
  );
  const warehouseScope = mapWarehouseScope(notification.warehouse);

  return {
    _id: notification._id,
    warehouseId: warehouseScope.warehouseId,
    warehouseCode: warehouseScope.warehouseCode,
    warehouseName: warehouseScope.warehouseName,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    entityType: notification.entityType || null,
    entityId: notification.entityId || null,
    actorUser: notification.actorUser || null,
    metadata: notification.metadata || {},
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
    read: Boolean(readEntry),
    readAt: readEntry?.readAt || null
  };
};

export const createInAppNotification = async ({
  organizationId,
  warehouseId = null,
  type,
  title,
  message,
  severity = 'info',
  entityType = null,
  entityId = null,
  actorUserId = null,
  metadata = {}
}) => {
  const normalizedType = String(type || '').trim();
  const normalizedTitle = String(title || '').trim();
  const normalizedMessage = String(message || '').trim();

  if (
    !organizationId ||
    !normalizedType ||
    !normalizedTitle ||
    !normalizedMessage
  ) {
    throw new AppError(
      'organizationId, type, title, and message are required',
      400
    );
  }

  const payload = {
    organization: organizationId,
    warehouse: resolveWarehouseId({
      warehouseId,
      metadata
    }),
    type: normalizedType,
    title: normalizedTitle,
    message: normalizedMessage,
    severity: ['info', 'warning', 'critical'].includes(String(severity))
      ? String(severity)
      : 'info',
    entityType: entityType ? String(entityType).trim() : null,
    entityId: toObjectId(entityId),
    actorUser: toObjectId(actorUserId),
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : {}
  };

  const notification = await NotificationEvent.create(payload);

  publishNotificationCreated({
    organizationId,
    actorUserId: actorUserId || null,
    notification
  });

  return notification;
};

export const listInAppNotifications = async ({
  organizationId,
  userId,
  userRole = null,
  warehouseId = null,
  limit = 20,
  unreadOnly = false
}) => {
  if (!organizationId || !userId) {
    throw new AppError('organizationId and userId are required', 400);
  }

  const normalizedLimit = toPositiveInt(limit, 20, 1, 100);
  const scopedWarehouseId = toObjectId(warehouseId);
  const scopedBaseQuery = applyRoleScopeToQuery({
    query: {
      organization: organizationId
    },
    userRole
  });
  const listQuery = {
    ...scopedBaseQuery
  };
  const unreadQuery = {
    organization: organizationId
    // role scoping applied below
  };
  Object.assign(
    unreadQuery,
    applyRoleScopeToQuery({
      query: unreadQuery,
      userRole
    })
  );

  if (unreadOnly) {
    listQuery.readBy = {
      $not: {
        $elemMatch: {
          user: userId
        }
      }
    };
  }

  if (scopedWarehouseId) {
    const warehouseScope = [
      { warehouse: scopedWarehouseId },
      { warehouse: null },
      { warehouse: { $exists: false } }
    ];
    listQuery.$and = [...(listQuery.$and || []), { $or: warehouseScope }];
    unreadQuery.$and = [...(unreadQuery.$and || []), { $or: warehouseScope }];
  }

  const [items, unreadCount] = await Promise.all([
    NotificationEvent.find(listQuery)
      .sort({ createdAt: -1 })
      .limit(normalizedLimit)
      .populate('warehouse', 'name code'),
    NotificationEvent.countDocuments({
      ...unreadQuery,
      readBy: {
        $not: {
          $elemMatch: {
            user: userId
          }
        }
      }
    })
  ]);

  return {
    items: items.map((item) => mapNotification(item, userId)),
    unreadCount
  };
};

export const markNotificationAsRead = async ({
  organizationId,
  userId,
  userRole = null,
  notificationId
}) => {
  if (!organizationId || !userId || !notificationId) {
    throw new AppError(
      'organizationId, userId, and notificationId are required',
      400
    );
  }

  const notificationQuery = applyRoleScopeToQuery({
    query: {
      _id: notificationId,
      organization: organizationId
    },
    userRole
  });

  const notification = await NotificationEvent.findOne(
    notificationQuery
  ).populate('warehouse', 'name code');

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  const alreadyRead = (notification.readBy || []).some(
    (entry) => String(entry?.user || '') === String(userId)
  );

  if (!alreadyRead) {
    notification.readBy.push({
      user: userId,
      readAt: new Date()
    });
    await notification.save();
  }

  return mapNotification(notification, userId);
};

export const markAllNotificationsAsRead = async ({
  organizationId,
  userId,
  userRole = null,
  warehouseId = null
}) => {
  if (!organizationId || !userId) {
    throw new AppError('organizationId and userId are required', 400);
  }

  const unreadQuery = applyRoleScopeToQuery({
    query: {
      organization: organizationId,
      readBy: {
        $not: {
          $elemMatch: {
            user: userId
          }
        }
      }
    },
    userRole
  });

  const scopedWarehouseId = toObjectId(warehouseId);
  if (scopedWarehouseId) {
    unreadQuery.$and = [
      ...(unreadQuery.$and || []),
      {
        $or: [
          { warehouse: scopedWarehouseId },
          { warehouse: null },
          { warehouse: { $exists: false } }
        ]
      }
    ];
  }

  const unreadNotifications =
    await NotificationEvent.find(unreadQuery).select('_id readBy');

  if (!unreadNotifications.length) {
    return {
      updatedCount: 0
    };
  }

  for (const notification of unreadNotifications) {
    notification.readBy.push({
      user: userId,
      readAt: new Date()
    });
    await notification.save();
  }

  return {
    updatedCount: unreadNotifications.length
  };
};

export default {
  createInAppNotification,
  listInAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
