/**
 * Forecast Engine
 * ----------------
 * Pure analytics module responsible for generating demand forecasts
 * based on historical usage / sales data.
 *
 * IMPORTANT:
 * - No external API calls
 * - Forecast persistence is NON-BLOCKING
 *
 * This engine can be safely used by:
 * - forecastService
 * - reorderEngine (later)
 * - anomalyDetection comparisons
 */

const DEFAULT_OPTIONS = {
  horizonDays: 30,
  method: 'moving-average',
  windowSize: 7
};

/**
 * Calculates a simple moving average forecast.
 */
function movingAverage(data, windowSize) {
  if (!Array.isArray(data) || data.length === 0) return 0;

  const window = data.slice(-windowSize);
  const sum = window.reduce((acc, val) => acc + val, 0);

  return sum / window.length;
}

/**
 * Calculates standard deviation.
 */
function standardDeviation(data, mean) {
  if (!Array.isArray(data) || data.length === 0) return 0;

  const variance =
    data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    data.length;

  return Math.sqrt(variance);
}

/**
 * Generates a demand forecast and persists it.
 */
function generateForecast({
  productId,
  historicalDemand = [],
  options = {}
}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const avgDailyDemand = movingAverage(
    historicalDemand,
    config.windowSize
  );

  const demandStdDev = standardDeviation(
    historicalDemand,
    avgDailyDemand
  );

  const expectedDemand =
    avgDailyDemand * config.horizonDays;

  const confidenceScore =
    avgDailyDemand === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            1 - demandStdDev / avgDailyDemand
          )
        );

  const forecast = {
    productId,
    horizonDays: config.horizonDays,
    expectedDemand: Math.round(expectedDemand),
    avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
    volatility: Number(demandStdDev.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(2)),
    modelUsed: config.method,
    generatedAt: new Date()
  };

  /**
   * 🔒 NON-BLOCKING persistence
   * Analytics must NEVER crash system flow
   */
  try {
    const Forecast =
      require('../models/Forecast.js').default ||
      require('../models/Forecast.js');

    Forecast.create({
      product: productId,
      horizonDays: forecast.horizonDays,
      expectedDemand: forecast.expectedDemand,
      avgDailyDemand: forecast.avgDailyDemand,
      volatility: forecast.volatility,
      confidenceScore: forecast.confidenceScore,
      modelUsed: forecast.modelUsed,
      generatedAt: forecast.generatedAt
    }).catch(() => {});
  } catch (_) {
    // Silent fail by design
  }

  return forecast;
}

module.exports = {
  generateForecast
};