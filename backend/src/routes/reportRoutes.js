import express from 'express';
import {
  getPurchaseOrderStatusSummary,
  getSupplierPurchaseOrderSummary,
  getPurchaseOrderTrend
} from '../controllers/reportsController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';
import { getPurchaseOrderValueSummary } from '../controllers/reportsController.js';
const router = express.Router();

// 🔐 Admin only
router.use(protect, requireRoles('admin'));

/**
 * 📊 Purchase order status summary
 */
router.get(
  '/purchase-orders/status-summary',
  getPurchaseOrderStatusSummary
);

/**
 * 🏭 Purchase orders by supplier (A20.3.2)
 */
router.get(
  '/purchase-orders/by-supplier',
  getSupplierPurchaseOrderSummary
);

/**
 * 📈 Purchase order trend (A20.3.3)
 * ?period=day | month
 */
router.get(
  '/purchase-orders/trend',
  getPurchaseOrderTrend
);
/**
 * 💰 Purchase order value summary
 */
router.get(
  '/purchase-orders/value-summary',
  getPurchaseOrderValueSummary
);


router.get(
  '/spend/summary',
  getTotalSpendSummary
);
router.get(
  '/spend/by-supplier',
  getSpendBySupplier
);
router.get(
  '/spend/by-supplier',
  getSpendBySupplier
);
router.get(
  '/spend/by-product',
  getSpendByProduct
);
router.get(
  '/spend/monthly-trend',
  getMonthlySpendTrend
);


export default router;