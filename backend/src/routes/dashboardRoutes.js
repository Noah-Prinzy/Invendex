import express from 'express';
import {
  getDashboardDeadStock,
  getDashboardFastestMovingSkus,
  getDashboardSlowMovingSkus,
  getDashboardStockAgingBuckets,
  getDashboardSupplierReliability,
  getDashboardSupplierRanking,
  getDashboardTopSellingItems,
  getDashboardTurnoverSkus
} from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();

router.use(protect, requireOrganization, requireRoles('admin', 'manager', 'staff'));

router.get('/top-selling-items', getDashboardTopSellingItems);
router.get('/turnover-skus', getDashboardTurnoverSkus);
router.get('/fastest-moving-skus', getDashboardFastestMovingSkus);
router.get('/slow-moving-skus', getDashboardSlowMovingSkus);
router.get('/dead-stock', getDashboardDeadStock);
router.get('/stock-aging-buckets', getDashboardStockAgingBuckets);
router.get('/supplier-ranking', getDashboardSupplierRanking);
router.get('/supplier-reliability', getDashboardSupplierReliability);

export default router;
