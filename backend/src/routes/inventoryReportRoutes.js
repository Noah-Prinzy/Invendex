import express from 'express';
import {
  downloadInventoryReportExport,
  exportInventoryReport,
  getInventoryReportExportJobStatus,
  queueInventoryReportExport
} from '../controllers/inventoryReportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  exportInventoryReportValidator,
  inventoryReportExportJobIdValidator,
  queueInventoryReportExportValidator
} from '../validations/inventoryReportValidators.js';

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
  '/export/jobs/:jobId/download',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryReportExportJobIdValidator,
  validateRequest,
  downloadInventoryReportExport
);

router.get(
  '/export/jobs/:jobId',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryReportExportJobIdValidator,
  validateRequest,
  getInventoryReportExportJobStatus
);

router.post(
  '/export/jobs',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  queueInventoryReportExportValidator,
  validateRequest,
  queueInventoryReportExport
);

router.get(
  '/export',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  exportInventoryReportValidator,
  validateRequest,
  exportInventoryReport
);

export default router;
