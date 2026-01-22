import express from 'express';
import { exportInventoryReport } from '../controllers/inventoryReportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

/**
 * 📊 Inventory Report Exports
 *
 * Base path:
 *   /api/inventory-reports
 *
 * Endpoint:
 *   GET /export
 *
 * Access:
 *   Admin, Staff
 *
 * Query params:
 *   - format=csv | xlsx   (default: csv)
 *   - from=YYYY-MM-DD     (optional)
 *   - to=YYYY-MM-DD       (optional)
 */
router.get(
  '/export',
  protect,
  requireRoles('admin', 'staff'),
  exportInventoryReport
);

export default router;