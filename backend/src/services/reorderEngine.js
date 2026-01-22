import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import Forecast from '../models/Forecast.js';
import { calculateReorderPoint } from '../utils/calculateReorderPoint.js';

/**
 * Run reorder engine for all active products.
 *
 * Forecast-aware logic:
 * - Prefer persisted forecasts when confidence is sufficient
 * - Fallback to static reorder point when not
 */
export const runReorderEngine = async (
  { triggeredBy = 'SYSTEM' } = {}
) => {
  const products = await Product.find({ isActive: true }).populate('supplier');

  const alerts = [];

  for (const product of products) {
    let shouldTriggerAlert = false;
    let reorderPointUsed = null;
    let forecastUsed = null;

    const leadTimeDays =
      product.supplierLeadTimeDays ||
      product.supplier?.leadTimeDays ||
      7;

    const safetyStockDays = product.safetyStockDays || 0;

    // 1️⃣ Try to use latest forecast
    const forecast = await Forecast.findOne({
      product: product._id
    }).sort({ generatedAt: -1 });

    if (
      forecast &&
      forecast.confidenceScore >= 0.6 &&
      forecast.avgDailyDemand > 0
    ) {
      reorderPointUsed = calculateReorderPoint({
        forecastAvgDailyDemand: forecast.avgDailyDemand,
        supplierLeadTimeDays: leadTimeDays,
        safetyStockDays
      });

      if (product.stock <= reorderPointUsed) {
        shouldTriggerAlert = true;
        forecastUsed = {
          forecastId: forecast._id,
          confidenceScore: forecast.confidenceScore,
          avgDailyDemand: forecast.avgDailyDemand,
          leadTimeDays
        };
      }
    }

    // 2️⃣ Fallback to static reorder logic
    if (!shouldTriggerAlert) {
      reorderPointUsed = calculateReorderPoint({
        averageDailyUsage: product.averageDailyUsage,
        supplierLeadTimeDays: leadTimeDays,
        safetyStockDays
      });

      if (product.stock <= reorderPointUsed) {
        shouldTriggerAlert = true;
      }
    }

    if (!shouldTriggerAlert) continue;

    // 3️⃣ Prevent duplicate active alerts
    const exists = await ReorderAlert.findOne({
      product: product._id,
      resolved: false
    });

    if (exists) continue;

    const alert = await ReorderAlert.create({
      product: product._id,
      sku: product.sku,
      currentStock: product.stock,
      reorderPoint: reorderPointUsed,
      triggeredBy,
      source: forecastUsed ? 'FORECAST' : 'STATIC',
      metadata: forecastUsed || undefined
    });

    alerts.push(alert);
  }

  return alerts;
};