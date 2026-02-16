import express from 'express';
import {
  getLatestInventoryMetrics,
  getInventoryMetricsRange
} from '../controllers/inventoryMetricsController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';
import requireOrganization from '../middlewares/requireOrganization.js';

const router = express.Router();
router.use(protect, requireOrganization);

/**
 * 📊 Latest inventory metrics
 * Access: Admin & Staff
 */
router.get(
  '/latest',
  requireRoles('admin', 'staff'),
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
  requireRoles('admin', 'staff'),
  getInventoryMetricsRange
);

export default router;
