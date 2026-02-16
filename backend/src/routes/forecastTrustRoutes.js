import express from 'express';
import {
  getForecastTrustForProduct
} from '../controllers/forecastTrustController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';

const router = express.Router();
router.use(protect, requireOrganization, requireRoles('admin', 'manager', 'staff'));

/**
 * 🔍 Forecast trust visibility
 * GET /api/forecast-trust/:productId
 */
router.get('/:productId', getForecastTrustForProduct);

export default router;
