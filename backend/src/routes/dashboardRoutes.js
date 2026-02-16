import express from 'express';
import {
  getDashboardSlowMovingSkus,
  getDashboardStockAgingBuckets,
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
router.get('/slow-moving-skus', getDashboardSlowMovingSkus);
router.get('/stock-aging-buckets', getDashboardStockAgingBuckets);
router.get('/supplier-ranking', getDashboardSupplierRanking);

export default router;
