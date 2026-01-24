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
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

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

  return InventoryMetrics.findOneAndUpdate(
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
};

/**
 * 🧮 PURE demand calculation helper
 * Calculates average daily demand from ordered snapshots
 */
const calculateAverageDailyDemand = (snapshots, days) => {
  let totalDemand = 0;

  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const curr = snapshots[i];

    const delta = prev.stock - curr.stock;

    // Only decreases count as demand
    if (delta > 0) {
      totalDemand += delta;
    }
  }

  return totalDemand === 0 ? 0 : totalDemand / days;
};

/**
 * 📉 Calculate average daily demand per SKU
 *
 * @param {number} days
 * @param {Date} [endDateOverride]
 * @returns {Object} { sku: avgDailyDemand }
 */
export const getAverageDailyDemandPerSku = async (
  days = 30,
  endDateOverride = null
) => {
  if (days < 2) {
    throw new Error('At least 2 days are required to calculate demand');
  }

  const endDate = endDateOverride
    ? new Date(endDateOverride)
    : new Date();

  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  const snapshots = await InventorySnapshot.find({
    recordedAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ sku: 1, recordedAt: 1 })
    .lean();

  // 🧠 Group snapshots per SKU
  const snapshotsBySku = {};
  for (const snap of snapshots) {
    if (!snapshotsBySku[snap.sku]) {
      snapshotsBySku[snap.sku] = [];
    }
    snapshotsBySku[snap.sku].push(snap);
  }

  const avgDemandPerSku = {};

  for (const [sku, skuSnapshots] of Object.entries(snapshotsBySku)) {
    avgDemandPerSku[sku] = calculateAverageDailyDemand(
      skuSnapshots,
      days
    );
  }

  return avgDemandPerSku;
};