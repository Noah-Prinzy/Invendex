import express from 'express';
import {
  getLatestInventoryMetrics,
  getInventoryMetricsRange
} from '../controllers/inventoryMetricsController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();
router.use(protect, requireOrganization);

/**
 * 📊 Latest inventory metrics
 * Access: Admin & Staff
 */
router.get(
  '/latest',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  getLatestInventoryMetrics
);

/**
 * 📅 Inventory metrics by date range
 * Query params:
 * - from=YYYY-MM-DD (optional)
 * - to=YYYY-MM-DD (optional)
 *
 * Access: Admin & Staff
 */
router.get(
  '/range',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  getInventoryMetricsRange
);

export default router;
