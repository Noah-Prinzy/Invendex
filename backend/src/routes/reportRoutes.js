import express from 'express';
import {
  getMonthlySpendTrend,
  getPurchaseOrderStatusSummary,
  getPurchaseOrderTrend,
  getPurchaseOrderValueSummary,
  getSpendByProduct,
  getSpendBySupplier,
  getSupplierPurchaseOrderSummary,
  getTotalSpendSummary
} from '../controllers/reportsController.js';
import {
  downloadReportExportJob,
  getReportExportJobStatus,
  queueReportExportJob
} from '../controllers/reportExportController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  queueReportExportJobValidator,
  reportExportJobIdValidator
} from '../validations/reportValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.REPORTS_VIEW)
);

router.post(
  '/export/jobs',
  queueReportExportJobValidator,
  validateRequest,
  queueReportExportJob
);

router.get(
  '/export/jobs/:jobId',
  reportExportJobIdValidator,
  validateRequest,
  getReportExportJobStatus
);

router.get(
  '/export/jobs/:jobId/download',
  reportExportJobIdValidator,
  validateRequest,
  downloadReportExportJob
);

router.get('/purchase-orders/status-summary', getPurchaseOrderStatusSummary);
router.get('/purchase-orders/by-supplier', getSupplierPurchaseOrderSummary);
router.get('/purchase-orders/trend', getPurchaseOrderTrend);
router.get('/purchase-orders/value-summary', getPurchaseOrderValueSummary);

router.get('/spend/summary', getTotalSpendSummary);
router.get('/spend/by-supplier', getSpendBySupplier);
router.get('/spend/by-product', getSpendByProduct);
router.get('/spend/monthly-trend', getMonthlySpendTrend);

export default router;
