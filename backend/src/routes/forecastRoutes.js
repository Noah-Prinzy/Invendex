import express from 'express';
import {
  forecastInventory,
  generateReorderAlertsFromForecast
} from '../controllers/forecastController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireFeatureFlag from '../middlewares/requireFeatureFlag.js';
import requirePermission from '../middlewares/requirePermission.js';
import requirePlanFeature from '../middlewares/requirePlanFeature.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import responseCache from '../middlewares/responseCache.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import Product from '../models/Product.js';
import { generateProductForecast } from '../services/inventory/forecastService.js';

const router = express.Router();
const forecastCache = responseCache({
  namespace: 'forecast',
  ttlMs: Number(process.env.FORECAST_CACHE_TTL_MS || 2 * 60 * 1000)
});

// 🔐 Admin & Manager only
router.use(
  protect,
  requireOrganization,
  requireFeatureFlag('forecasting_engine'),
  requirePlanFeature('forecasting_engine'),
  requirePermission(PERMISSIONS.FORECAST_VIEW)
);

router.get('/inventory', forecastCache, forecastInventory);

router.post('/inventory/reorder-alerts', generateReorderAlertsFromForecast);

// forecastRoutes.js
router.post(
  '/run',
  requirePermission(PERMISSIONS.FORECAST_MANAGE),
  async (req, res, next) => {
    try {
      const products = await Product.find({
        organization: req.organizationId,
        isActive: true
      });

      let generated = 0;

      for (const product of products) {
        const history = product.stockHistory
          .filter((h) => h.change < 0)
          .map((h) => Math.abs(h.change));

        if (history.length === 0) continue;

        await generateProductForecast({
          organizationId: req.organizationId,
          productId: product._id,
          historicalDemand: history
        });

        generated++;
      }

      res.json({
        success: true,
        message: 'Forecasts generated',
        generated
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
