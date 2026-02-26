import express from 'express';
import { compareReorderAlerts } from '../controllers/reorderAlertController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();
router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.REORDER_MANAGE)
);

/**
 * 🔍 Compare reorder alerts (STATIC vs FORECAST)
 */
router.get('/compare', compareReorderAlerts);

export default router;
