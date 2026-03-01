import { successResponse } from '../utils/response.js';
import {
  listInAppNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../services/notifications/inAppNotificationService.js';

export const getNotifications = async (req, res, next) => {
  try {
    const result = await listInAppNotifications({
      organizationId: req.organizationId,
      userId: req.user?._id,
      limit: req.query?.limit,
      unreadOnly:
        String(req.query?.unreadOnly || '')
          .trim()
          .toLowerCase() === 'true'
    });

    return successResponse(
      res,
      {
        items: result.items,
        unreadCount: result.unreadCount
      },
      'Notifications fetched'
    );
  } catch (error) {
    next(error);
  }
};

export const readNotification = async (req, res, next) => {
  try {
    const notification = await markNotificationAsRead({
      organizationId: req.organizationId,
      userId: req.user?._id,
      notificationId: req.params.id
    });

    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

export const readAllNotifications = async (req, res, next) => {
  try {
    const result = await markAllNotificationsAsRead({
      organizationId: req.organizationId,
      userId: req.user?._id
    });

    return successResponse(res, result, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  readNotification,
  readAllNotifications
};
