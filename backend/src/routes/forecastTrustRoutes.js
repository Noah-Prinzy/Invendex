import express from 'express';
import {
  getForecastTrustForProduct
} from '../controllers/forecastTrustController.js';

const router = express.Router();

/**
 * 🔍 Forecast trust visibility
 * GET /api/forecast-trust/:productId
 */
router.get('/:productId', getForecastTrustForProduct);

export default router;