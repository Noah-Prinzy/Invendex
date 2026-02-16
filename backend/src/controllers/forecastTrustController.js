import Product from '../models/Product.js';
import Forecast from '../models/Forecast.js';

/**
 * GET forecast trust information for a product
 *
 * Read-only, explainable data for admin / UI visibility
 */
export const getForecastTrustForProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const organizationId = req.organizationId;

    const product = await Product.findOne({
      _id: productId,
      organization: organizationId
    }).select('_id sku name');

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    const forecast = await Forecast.findOne({
      organization: organizationId,
      product: product._id
    }).sort({ generatedAt: -1 });

    if (!forecast) {
      return res.json({
        productId: product._id,
        sku: product.sku,
        forecast: null,
        trust: {
          score: 0,
          status: 'UNAVAILABLE'
        }
      });
    }

    const confidenceScore = forecast.confidenceScore || 0;

    /**
     * Trust scoring heuristic
     * Simple, explainable, UI-friendly
     */
    let trustStatus = 'UNTRUSTED';
    if (confidenceScore >= 0.7) trustStatus = 'TRUSTED';
    else if (confidenceScore >= 0.4) trustStatus = 'CAUTION';

    return res.json({
      productId: product._id,
      sku: product.sku,
      forecast: {
        avgDailyDemand: forecast.avgDailyDemand,
        confidenceScore,
        volatility: forecast.volatility,
        horizonDays: forecast.horizonDays,
        generatedAt: forecast.generatedAt
      },
      trust: {
        score: Number(confidenceScore.toFixed(2)),
        status: trustStatus
      }
    });
  } catch (err) {
    next(err);
  }
};
