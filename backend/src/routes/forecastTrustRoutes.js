import express from 'express';
import { getForecastTrustForProduct } from '../controllers/forecastTrustController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import { PERMISSIONS } from '../authorization/permissions.js';

const router = express.Router();
router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.INVENTORY_VIEW)
);

/**
 * 🔍 Forecast trust visibility
 * GET /api/forecast-trust/:productId
 */
router.get('/:productId', getForecastTrustForProduct);

export default router;
