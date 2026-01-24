/**
 * Forecast Engine
 * ----------------
 * Pure analytics module responsible for generating demand forecasts.
 *
 * IMPORTANT:
 * - No database access
 * - No external API calls
 * - No side effects
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
 * Generates a demand forecast.
 */
export function generateForecast({
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

  return {
    productId,
    horizonDays: config.horizonDays,
    expectedDemand: Math.round(expectedDemand),
    avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
    volatility: Number(demandStdDev.toFixed(2)),
    confidenceScore: Number(confidenceScore.toFixed(2)),
    modelUsed: config.method,
    generatedAt: new Date()
  };
}