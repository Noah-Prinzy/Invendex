import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  getNotifications,
  readAllNotifications,
  readNotification
} from '../controllers/notificationController.js';
import {
  listNotificationsValidator,
  notificationIdParamValidator
} from '../validations/notificationValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW)
);

router.get('/', listNotificationsValidator, validateRequest, getNotifications);
router.patch('/read-all', readAllNotifications);
router.patch(
  '/:id/read',
  notificationIdParamValidator,
  validateRequest,
  readNotification
);

export default router;
