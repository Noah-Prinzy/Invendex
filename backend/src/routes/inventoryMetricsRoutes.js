import express from 'express';
import {
  getLatestInventoryMetrics,
  getInventoryMetricsRange
} from '../controllers/inventoryMetricsController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

/**
 * 📊 Latest inventory metrics
 * Access: Admin & Staff
 */
router.get(
  '/latest',
  protect,
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
  protect,
  requireRoles('admin', 'staff'),
  getInventoryMetricsRange
);

export default router;
