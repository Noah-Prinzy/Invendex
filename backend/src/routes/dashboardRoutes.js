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
import requirePermission from '../middlewares/requirePermission.js';
import responseCache from '../middlewares/responseCache.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();
const dashboardCache = responseCache({
  namespace: 'dashboard',
  ttlMs: Number(process.env.DASHBOARD_CACHE_TTL_MS || 60 * 1000)
});

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.DASHBOARD_VIEW)
);

router.get('/top-selling-items', dashboardCache, getDashboardTopSellingItems);
router.get('/turnover-skus', dashboardCache, getDashboardTurnoverSkus);
router.get(
  '/fastest-moving-skus',
  dashboardCache,
  getDashboardFastestMovingSkus
);
router.get('/slow-moving-skus', dashboardCache, getDashboardSlowMovingSkus);
router.get('/dead-stock', dashboardCache, getDashboardDeadStock);
router.get(
  '/stock-aging-buckets',
  dashboardCache,
  getDashboardStockAgingBuckets
);
router.get('/supplier-ranking', dashboardCache, getDashboardSupplierRanking);
router.get(
  '/supplier-reliability',
  dashboardCache,
  getDashboardSupplierReliability
);

export default router;
