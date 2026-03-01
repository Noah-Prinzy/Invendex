import mongoose from 'mongoose';
import NotificationEvent from '../../models/NotificationEvent.js';
import { AppError } from '../../errors/AppError.js';
import { publishNotificationCreated } from '../../realtime/publisher.js';

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

const mapNotification = (notification, userId = null) => {
  if (!notification) return null;
  const normalizedUserId = String(userId || '').trim();
  const readEntry = (notification.readBy || []).find(
    (entry) => String(entry?.user || '') === normalizedUserId
  );

  return {
    _id: notification._id,
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
  limit = 20,
  unreadOnly = false
}) => {
  if (!organizationId || !userId) {
    throw new AppError('organizationId and userId are required', 400);
  }

  const normalizedLimit = toPositiveInt(limit, 20, 1, 100);
  const baseQuery = {
    organization: organizationId
  };

  if (unreadOnly) {
    baseQuery.readBy = {
      $not: {
        $elemMatch: {
          user: userId
        }
      }
    };
  }

  const [items, unreadCount] = await Promise.all([
    NotificationEvent.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(normalizedLimit),
    NotificationEvent.countDocuments({
      organization: organizationId,
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
  notificationId
}) => {
  if (!organizationId || !userId || !notificationId) {
    throw new AppError(
      'organizationId, userId, and notificationId are required',
      400
    );
  }

  const notification = await NotificationEvent.findOne({
    _id: notificationId,
    organization: organizationId
  });

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
  userId
}) => {
  if (!organizationId || !userId) {
    throw new AppError('organizationId and userId are required', 400);
  }

  const unreadNotifications = await NotificationEvent.find({
    organization: organizationId,
    readBy: {
      $not: {
        $elemMatch: {
          user: userId
        }
      }
    }
  }).select('_id readBy');

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
