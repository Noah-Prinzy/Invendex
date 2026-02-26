import express from 'express';
import { exportInventoryReport } from '../controllers/inventoryReportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();
router.use(protect, requireOrganization);

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
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  exportInventoryReport
);

export default router;
