/**
 * Forecast Service
 * ----------------
 * Service-layer wrapper around the forecast engine.
 *
 * Responsibilities:
 * - Prepare historical demand data
 * - Invoke forecast engine
 * - Persist forecast results (non-blocking)
 * - Return forecast results
 *
 * IMPORTANT:
 * - No route logic
 * - Persistence failures must NOT break callers
 */

const { generateForecast } = require('../../analytics/forecastEngine');

// ES module import used by models in your codebase
const ForecastResult = require('../../models/ForecastResult.js').default;

/**
 * Persist forecast result safely (non-blocking).
 *
 * @param {Object} forecast
 */
async function persistForecastSafely(forecast) {
  try {
    await ForecastResult.create({
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
    // Intentionally swallow errors
    // Forecasting must never fail due to persistence
    console.error(
      '[ForecastService] Failed to persist forecast:',
      err.message
    );
  }
}

/**
 * Generate a demand forecast for a product.
 *
 * @param {Object} params
 * @param {string} params.productId
 * @param {number[]} params.historicalDemand
 * @param {Object} [params.options]
 *
 * @returns {Object} forecast result
 */
async function generateProductForecast({
  productId,
  historicalDemand = [],
  options = {}
}) {
  if (!productId) {
    throw new Error('productId is required to generate forecast');
  }

  const forecast = generateForecast({
    productId,
    historicalDemand,
    options
  });

  // Fire-and-forget persistence
  persistForecastSafely(forecast);

  return forecast;
}

/**
 * Generate forecasts for multiple products.
 *
 * @param {Array} products
 * @param {Object} [options]
 *
 * @returns {Array} forecast results
 */
async function generateBulkForecast(products = [], options = {}) {
  if (!Array.isArray(products)) return [];

  const forecasts = products.map(product => {
    return generateForecast({
      productId: product.productId || product._id,
      historicalDemand: product.historicalDemand || [],
      options
    });
  });

  // Persist in background (parallel, non-blocking)
  forecasts.forEach(forecast => {
    persistForecastSafely(forecast);
  });

  return forecasts;
}

module.exports = {
  generateProductForecast,
  generateBulkForecast
};