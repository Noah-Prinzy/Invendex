import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import {
  getAverageDailyDemandPerSku
} from './inventoryMetricsService.js';

const ENGINE_VERSION = 'v1.3';

/**
 * 🔁 Reorder Engine
 * Generates reorder alerts based on demand & stock
 */
export const runReorderEngine = async ({
  triggeredBy = 'system',
  lookbackDays = 30,
  source = 'cron',
  runDate = null // ✅ deterministic engine date
} = {}) => {
  // ✅ ENUM-SAFE normalization
  const normalizedSource = String(source).toLowerCase();

  const ALLOWED_SOURCES = [
    'cron',
    'system',
    'forecast',
    'static',
    'manual'
  ];

  if (!ALLOWED_SOURCES.includes(normalizedSource)) {
    throw new Error(`Invalid reorder source: ${source}`);
  }

  // 🕒 Engine execution date (normalized)
  const engineDate = runDate ? new Date(runDate) : new Date();
  engineDate.setHours(0, 0, 0, 0);

  // 🔢 Demand calculation
  const avgDemandPerSku =
    await getAverageDailyDemandPerSku(
      lookbackDays,
      engineDate
    );

  // 📦 Active products
  const products = await Product.find({ isActive: true }).lean();

  // 🏭 Supplier links
  const supplierLinks = await SupplierProduct.find({
    isActive: true
  }).lean();

  const alertsCreated = [];

  for (const product of products) {
    const avgDailyDemand =
      avgDemandPerSku[product.sku] || 0;

    const supplierLink =
      supplierLinks
        .filter(s => s.product.toString() === product._id.toString())
        .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0] || null;


    const leadTimeDays =
      supplierLink?.leadTimeDays ||
      product.supplierLeadTimeDays ||
      7;

    const minimumOrderQuantity =
      supplierLink?.minimumOrderQuantity || 1;

    // 🧮 Adjusted demand
    const adjustedDailyDemand = avgDailyDemand;

    // 🧠 Forecast confidence
    const trustScore = avgDailyDemand > 0 ? 0.7 : 0.3;

    // 🧮 Reorder level
    const reorderLevel = Math.max(
      Math.ceil(adjustedDailyDemand * leadTimeDays * 1.2),
      product.lowStockThreshold || 0
    );

    // 🚫 No reorder needed
    if (product.stock > reorderLevel) continue;

    // ❗ Prevent duplicate active alerts (same product, same day)
    const exists = await ReorderAlert.findOne({
      product: product._id,
      triggeredAt: { $gte: engineDate },
      resolved: false
    }).lean();

    if (exists) continue;

    /**
     * ✅ BUSINESS RULE:
     * Always respect supplier MOQ
     */
    const calculatedReorderQty = Math.ceil(
      adjustedDailyDemand * leadTimeDays
    );

    const reorderQuantity = Math.max(
      calculatedReorderQty,
      minimumOrderQuantity,
      1
    );

    const alert = await ReorderAlert.create({
      product: product._id,
      sku: product.sku,
      stock: product.stock,
      reorderLevel,
      reorderQuantity,
      status: 'ACTIVE',
      triggeredAt: engineDate,
      source: normalizedSource,

      metadata: {
        avgDailyDemand,
        adjustedDailyDemand,
        forecastTrustScore: trustScore,
        leadTimeDays,
        lowStockThreshold: product.lowStockThreshold,
        minimumOrderQuantity,
        engineVersion: ENGINE_VERSION
      },

      supplier: supplierLink?.supplier || null,
      supplierLeadTimeDays: supplierLink?.leadTimeDays || null,
      supplierUnitCost: supplierLink?.unitCost || null
    });

    alertsCreated.push(alert);
  }

  return {
    generated: alertsCreated.length,
    alerts: alertsCreated
  };
};

export default {
  runReorderEngine
};