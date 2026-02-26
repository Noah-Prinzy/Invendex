import express from 'express';
import {
  getProductSeasonality,
  getPromotionForecast,
  getSupplierLeadTimeVariability,
  getSupplierReliability
} from '../controllers/aiInsightsController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.FORECAST_VIEW)
);

router.get('/seasonality/:productId', getProductSeasonality);
router.post('/promotion-forecast', getPromotionForecast);
router.get(
  '/lead-time-variability/:supplierId',
  getSupplierLeadTimeVariability
);
router.get('/supplier-reliability', getSupplierReliability);

export default router;
