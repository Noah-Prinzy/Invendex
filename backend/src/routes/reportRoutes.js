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
import responseCache from '../middlewares/responseCache.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  queueReportExportJobValidator,
  reportExportJobIdValidator
} from '../validations/reportValidators.js';

const router = express.Router();
const reportCache = responseCache({
  namespace: 'reports',
  ttlMs: Number(process.env.REPORT_CACHE_TTL_MS || 2 * 60 * 1000)
});

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

router.get(
  '/purchase-orders/status-summary',
  reportCache,
  getPurchaseOrderStatusSummary
);
router.get(
  '/purchase-orders/by-supplier',
  reportCache,
  getSupplierPurchaseOrderSummary
);
router.get('/purchase-orders/trend', reportCache, getPurchaseOrderTrend);
router.get(
  '/purchase-orders/value-summary',
  reportCache,
  getPurchaseOrderValueSummary
);

router.get('/spend/summary', reportCache, getTotalSpendSummary);
router.get('/spend/by-supplier', reportCache, getSpendBySupplier);
router.get('/spend/by-product', reportCache, getSpendByProduct);
router.get('/spend/monthly-trend', reportCache, getMonthlySpendTrend);

export default router;
