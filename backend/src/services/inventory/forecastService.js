/**
 * Forecast Service
 * ----------------
 * Service-layer wrapper around the forecast engine.
 */

import { generateForecast } from '../../analytics/forecastEngine.js';
import Forecast from '../../models/Forecast.js';

/**
 * Persist forecast result safely (non-blocking).
 */
async function persistForecastSafely(forecast) {
  try {
    await Forecast.create({
      organization: forecast.organizationId,
      product: forecast.productId,
      horizonDays: forecast.horizonDays,
      expectedDemand: forecast.expectedDemand,
      avgDailyDemand: forecast.avgDailyDemand,
      volatility: forecast.volatility,
      confidenceScore: forecast.confidenceScore,
      modelUsed: forecast.modelUsed,
      generatedAt: forecast.generatedAt
    });
  } catch (err) {
    console.error('[ForecastService] Failed to persist forecast:', err.message);
  }
}

/**
 * Generate a demand forecast for a product.
 */
export async function generateProductForecast({
  organizationId,
  productId,
  historicalDemand = [],
  options = {}
}) {
  if (!productId) {
    throw new Error('productId is required to generate forecast');
  }
  if (!organizationId) {
    throw new Error('organizationId is required to generate forecast');
  }

  const forecast = generateForecast({
    productId,
    historicalDemand,
    options
  });

  // Fire-and-forget persistence
  persistForecastSafely({
    ...forecast,
    organizationId
  });

  return forecast;
}

/**
 * Generate forecasts for multiple products.
 */
export async function generateBulkForecast(products = [], options = {}) {
  if (!Array.isArray(products)) return [];

  const forecasts = products.map((product) =>
    generateForecast({
      productId: product.productId || product._id,
      historicalDemand: product.historicalDemand || [],
      options
    })
  );

  forecasts.forEach((forecast, idx) =>
    persistForecastSafely({
      ...forecast,
      organizationId:
        products[idx]?.organizationId || products[idx]?.organization
    })
  );

  return forecasts;
}

/**
 * ✅ DEFAULT EXPORT (this fixes your error)
 */
export default {
  generateProductForecast,
  generateBulkForecast
};
