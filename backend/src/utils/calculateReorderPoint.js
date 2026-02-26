/**
 * Calculate reorder point for a product.
 *
 * Supports BOTH:
 * - Rule-based calculation (existing behavior)
 * - Forecast-driven calculation (new, optional)
 *
 * Backward-compatible by design.
 */
export const calculateReorderPoint = ({
  averageDailyUsage,
  supplierLeadTimeDays,
  safetyStockDays = 0,

  // 🔮 Optional forecast input
  forecastAvgDailyDemand
}) => {
  const dailyUsage =
    typeof forecastAvgDailyDemand === 'number' && forecastAvgDailyDemand > 0
      ? forecastAvgDailyDemand
      : averageDailyUsage;

  if (!dailyUsage || !supplierLeadTimeDays || supplierLeadTimeDays < 0) {
    return 0;
  }

  return Math.ceil(dailyUsage * (supplierLeadTimeDays + safetyStockDays));
};
