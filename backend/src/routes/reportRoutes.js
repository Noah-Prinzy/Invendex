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

import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.REPORTS_VIEW)
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
