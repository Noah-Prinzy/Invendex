import Product from '../models/Product.js';
import InventoryMetrics from '../models/InventoryMetrics.js';
import InventorySnapshot from '../models/InventorySnapshot.js';

/**
 * 📊 Generate daily inventory metrics
 * Idempotent: safe to run multiple times per day
 */
export const generateDailyInventoryMetrics = async (
  date = new Date(),
  generatedBy = 'cron'
) => {
  // Normalize date to start of day (00:00)
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // Fetch active products only
  const products = await Product.find({ isActive: true })
    .select('stock price')
    .lean();

  let totalStock = 0;
  let totalInventoryValue = 0;

  for (const product of products) {
    totalStock += product.stock;
    totalInventoryValue += product.stock * product.price;
  }

  const skuCount = products.length;
  const avgValuePerSku =
    skuCount === 0 ? 0 : totalInventoryValue / skuCount;

  // Upsert metrics for the day
  const metrics = await InventoryMetrics.findOneAndUpdate(
    { date: normalizedDate },
    {
      date: normalizedDate,
      totalStock,
      totalInventoryValue,
      skuCount,
      avgValuePerSku,
      generatedBy
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return metrics;
};

/**
 * 📉 Calculate average daily demand per SKU
 * Demand is derived from historical inventory snapshots
 *
 * @param {number} days - Number of days to analyze
 * @returns {Object} { sku: avgDailyDemand }
 */
export const getAverageDailyDemandPerSku = async (days = 30) => {
  if (days < 2) {
    throw new Error('At least 2 days are required to calculate demand');
  }

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  // Fetch snapshots ordered by SKU and date
  const snapshots = await InventorySnapshot.find({
    recordedAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ sku: 1, recordedAt: 1 })
    .lean();

  const demandMap = {};
  const countsMap = {};

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    if (prev.sku !== curr.sku) continue;

    const delta = prev.stock - curr.stock;

    // Only count decreases as demand
    if (delta > 0) {
      demandMap[curr.sku] = (demandMap[curr.sku] || 0) + delta;
      countsMap[curr.sku] = (countsMap[curr.sku] || 0) + 1;
    }
  }

  const avgDemandPerSku = {};

  for (const sku of Object.keys(demandMap)) {
    avgDemandPerSku[sku] =
      demandMap[sku] / countsMap[sku];
  }

  return avgDemandPerSku;
};