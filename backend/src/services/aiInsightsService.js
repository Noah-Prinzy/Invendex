import InventorySnapshot from '../models/InventorySnapshot.js';
import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ReorderAlert from '../models/ReorderAlert.js';
import Supplier from '../models/Supplier.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stdDev = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const percentile = (values, percentileRank) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  );
  return sorted[rank];
};

const mapBySupplier = (rows) => {
  const mapped = new Map();
  for (const row of rows) {
    mapped.set(String(row._id), row);
  }
  return mapped;
};

const toObjectId = (value) => {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

export const getSeasonalityInsight = async ({
  organizationId,
  productId,
  lookbackDays = 180
}) => {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(14, Number(lookbackDays) || 180));

  const snapshots = await InventorySnapshot.find({
    organization: organizationId,
    product: productId,
    recordedAt: { $gte: since }
  })
    .sort({ recordedAt: 1 })
    .select('recordedAt stock')
    .lean();

  if (snapshots.length < 2) {
    return {
      productId,
      lookbackDays: Math.max(14, Number(lookbackDays) || 180),
      avgDailyDemand: 0,
      weekdayFactors: {},
      sampleSize: 0
    };
  }

  const weekdayStats = DAY_NAMES.reduce((acc, dayName) => {
    acc[dayName] = { total: 0, count: 0 };
    return acc;
  }, {});

  const demandPoints = [];
  for (let idx = 1; idx < snapshots.length; idx += 1) {
    const previous = snapshots[idx - 1];
    const current = snapshots[idx];
    const demand = previous.stock - current.stock;
    if (demand <= 0) continue;

    const weekday = DAY_NAMES[new Date(current.recordedAt).getDay()];
    weekdayStats[weekday].total += demand;
    weekdayStats[weekday].count += 1;
    demandPoints.push(demand);
  }

  if (demandPoints.length === 0) {
    return {
      productId,
      lookbackDays: Math.max(14, Number(lookbackDays) || 180),
      avgDailyDemand: 0,
      weekdayFactors: {},
      sampleSize: 0
    };
  }

  const avgDailyDemand =
    demandPoints.reduce((sum, value) => sum + value, 0) / demandPoints.length;

  const weekdayFactors = {};
  for (const dayName of DAY_NAMES) {
    const dayAvg = weekdayStats[dayName].count
      ? weekdayStats[dayName].total / weekdayStats[dayName].count
      : avgDailyDemand;
    weekdayFactors[dayName] = Number((dayAvg / avgDailyDemand).toFixed(2));
  }

  return {
    productId,
    lookbackDays: Math.max(14, Number(lookbackDays) || 180),
    avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
    volatility: Number(stdDev(demandPoints).toFixed(2)),
    weekdayFactors,
    sampleSize: demandPoints.length
  };
};

export const projectPromotionAwareDemand = ({
  baseDailyDemand,
  horizonDays = 30,
  promotions = []
}) => {
  const normalizedBaseDemand = Math.max(0, toNumber(baseDailyDemand, 0));
  const normalizedHorizon = Math.max(
    1,
    Math.min(365, Number(horizonDays) || 30)
  );
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const normalizedPromotions = Array.isArray(promotions)
    ? promotions
        .map((entry) => ({
          startDate: new Date(entry.startDate),
          endDate: new Date(entry.endDate),
          liftPercent: toNumber(entry.liftPercent ?? entry.liftPct, 0)
        }))
        .filter(
          (entry) =>
            !Number.isNaN(entry.startDate.getTime()) &&
            !Number.isNaN(entry.endDate.getTime()) &&
            entry.endDate >= entry.startDate
        )
    : [];

  const dailyProjection = [];
  let adjustedDemand = 0;

  for (let dayOffset = 0; dayOffset < normalizedHorizon; dayOffset += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);

    let multiplier = 1;
    for (const promo of normalizedPromotions) {
      if (date >= promo.startDate && date <= promo.endDate) {
        multiplier += promo.liftPercent / 100;
      }
    }

    const dailyDemand = normalizedBaseDemand * multiplier;
    adjustedDemand += dailyDemand;

    dailyProjection.push({
      date: date.toISOString().slice(0, 10),
      baselineDemand: Number(normalizedBaseDemand.toFixed(2)),
      adjustedDemand: Number(dailyDemand.toFixed(2)),
      multiplier: Number(multiplier.toFixed(2))
    });
  }

  const baselineDemand = normalizedBaseDemand * normalizedHorizon;
  return {
    horizonDays: normalizedHorizon,
    baselineDemand: Number(baselineDemand.toFixed(2)),
    adjustedDemand: Number(adjustedDemand.toFixed(2)),
    incrementalDemand: Number((adjustedDemand - baselineDemand).toFixed(2)),
    dailyProjection
  };
};

export const getLeadTimeVariabilityInsight = async ({
  organizationId,
  supplierId,
  lookback = 50
}) => {
  const normalizedLookback = Math.max(5, Math.min(200, Number(lookback) || 50));

  const purchaseOrders = await PurchaseOrder.find({
    organization: organizationId,
    supplier: supplierId,
    status: { $in: ['RECEIVED', 'CLOSED'] },
    sentAt: { $ne: null },
    receivedAt: { $ne: null }
  })
    .sort({ receivedAt: -1 })
    .limit(normalizedLookback)
    .select('sentAt receivedAt expectedDeliveryDate')
    .lean();

  const leadTimes = purchaseOrders
    .map(
      (po) =>
        (new Date(po.receivedAt) - new Date(po.sentAt)) / (1000 * 60 * 60 * 24)
    )
    .filter((days) => Number.isFinite(days) && days >= 0);

  if (!leadTimes.length) {
    return {
      supplierId,
      sampleSize: 0,
      avgLeadTimeDays: 0,
      stdDevDays: 0,
      p95Days: 0,
      coefficientOfVariation: 0
    };
  }

  const avgLeadTime =
    leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length;
  const stdLeadTime = stdDev(leadTimes);

  return {
    supplierId,
    sampleSize: leadTimes.length,
    avgLeadTimeDays: Number(avgLeadTime.toFixed(2)),
    stdDevDays: Number(stdLeadTime.toFixed(2)),
    minDays: Number(Math.min(...leadTimes).toFixed(2)),
    maxDays: Number(Math.max(...leadTimes).toFixed(2)),
    p95Days: Number(percentile(leadTimes, 95).toFixed(2)),
    coefficientOfVariation: Number(
      (stdLeadTime / Math.max(avgLeadTime, 0.01)).toFixed(2)
    )
  };
};

export const getSupplierReliabilityScores = async ({
  organizationId,
  lookbackDays = 180,
  warehouseId = null
}) => {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(30, Number(lookbackDays) || 180));
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const warehouseObjectId = warehouseId ? toObjectId(warehouseId) : null;

  const [suppliers, purchaseOrderStats, alertStats] = await Promise.all([
    Supplier.find({ organization: organizationId, isActive: true })
      .select('_id name')
      .lean(),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          ...(warehouseObjectId ? { warehouse: warehouseObjectId } : {}),
          sentAt: { $gte: since },
          receivedAt: { $ne: null },
          status: { $in: ['RECEIVED', 'CLOSED'] }
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalOrders: { $sum: 1 },
          avgLeadTimeDays: {
            $avg: {
              $divide: [
                { $subtract: ['$receivedAt', '$sentAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$expectedDeliveryDate', null] },
                    { $lte: ['$receivedAt', '$expectedDeliveryDate'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    ReorderAlert.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          ...(warehouseObjectId ? { warehouse: warehouseObjectId } : {}),
          triggeredAt: { $gte: since },
          supplier: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$supplier',
          activeAlerts: {
            $sum: {
              $cond: [{ $eq: ['$resolved', false] }, 1, 0]
            }
          },
          totalAlerts: { $sum: 1 }
        }
      }
    ])
  ]);

  const poMap = mapBySupplier(purchaseOrderStats);
  const alertMap = mapBySupplier(alertStats);

  const ranking = suppliers.map((supplier) => {
    const supplierId = String(supplier._id);
    const poStat = poMap.get(supplierId) || {};
    const alertStat = alertMap.get(supplierId) || {};

    const totalOrders = poStat.totalOrders || 0;
    const avgLeadTimeDays = Number((poStat.avgLeadTimeDays || 0).toFixed(2));
    const onTimeRate =
      totalOrders > 0
        ? Number(((poStat.onTimeDeliveries / totalOrders) * 100).toFixed(2))
        : 0;
    const activeAlerts = alertStat.activeAlerts || 0;
    const totalAlerts = alertStat.totalAlerts || 0;
    const alertPressure =
      totalAlerts > 0 ? Number((activeAlerts / totalAlerts).toFixed(2)) : 0;

    const score = Math.max(
      0,
      Math.min(
        100,
        onTimeRate * 0.65 +
          Math.max(0, 100 - avgLeadTimeDays * 5) * 0.25 +
          Math.max(0, 100 - alertPressure * 100) * 0.1
      )
    );

    return {
      supplierId,
      supplierName: supplier.name,
      score: Number(score.toFixed(2)),
      onTimeRate,
      avgLeadTimeDays,
      totalOrders,
      activeAlerts
    };
  });

  ranking.sort((a, b) => b.score - a.score);
  return ranking;
};

export const getDemandAnomalyInsight = async ({
  organizationId,
  productId,
  lookbackDays = 180,
  zThreshold = 2.5,
  minDemand = 1
}) => {
  const normalizedLookbackDays = Math.max(14, Number(lookbackDays) || 180);
  const normalizedZThreshold = Math.max(
    1.5,
    Math.min(6, Number(zThreshold) || 2.5)
  );
  const normalizedMinDemand = Math.max(0, Number(minDemand) || 1);

  const since = new Date();
  since.setDate(since.getDate() - normalizedLookbackDays);

  const snapshots = await InventorySnapshot.find({
    organization: organizationId,
    product: productId,
    recordedAt: { $gte: since }
  })
    .sort({ recordedAt: 1 })
    .select('recordedAt stock')
    .lean();

  if (snapshots.length < 3) {
    return {
      productId,
      lookbackDays: normalizedLookbackDays,
      zThreshold: normalizedZThreshold,
      sampleSize: 0,
      anomalyCount: 0,
      anomalies: [],
      status: 'insufficient_data'
    };
  }

  const demandSeries = [];
  for (let idx = 1; idx < snapshots.length; idx += 1) {
    const previous = snapshots[idx - 1];
    const current = snapshots[idx];
    const demand = Number(previous.stock || 0) - Number(current.stock || 0);
    if (!Number.isFinite(demand) || demand < normalizedMinDemand) continue;

    demandSeries.push({
      recordedAt: current.recordedAt,
      demand
    });
  }

  if (!demandSeries.length) {
    return {
      productId,
      lookbackDays: normalizedLookbackDays,
      zThreshold: normalizedZThreshold,
      sampleSize: 0,
      anomalyCount: 0,
      anomalies: [],
      status: 'no_demand_points'
    };
  }

  const demandValues = demandSeries.map((entry) => entry.demand);
  const meanDemand =
    demandValues.reduce((sum, value) => sum + value, 0) / demandValues.length;
  const demandStdDev = stdDev(demandValues);

  const anomalies =
    demandStdDev <= 0
      ? []
      : demandSeries
          .map((entry) => {
            const zScore = (entry.demand - meanDemand) / demandStdDev;
            return {
              date: new Date(entry.recordedAt).toISOString().slice(0, 10),
              demand: Number(entry.demand.toFixed(2)),
              zScore: Number(zScore.toFixed(2)),
              severity:
                zScore >= normalizedZThreshold + 1
                  ? 'HIGH'
                  : zScore >= normalizedZThreshold
                    ? 'MEDIUM'
                    : 'LOW'
            };
          })
          .filter((entry) => entry.zScore >= normalizedZThreshold)
          .sort((a, b) => b.zScore - a.zScore);

  return {
    productId,
    lookbackDays: normalizedLookbackDays,
    zThreshold: normalizedZThreshold,
    sampleSize: demandSeries.length,
    baseline: {
      avgDemand: Number(meanDemand.toFixed(2)),
      stdDev: Number(demandStdDev.toFixed(2)),
      p95Demand: Number(percentile(demandValues, 95).toFixed(2))
    },
    anomalyCount: anomalies.length,
    anomalies,
    status: anomalies.length ? 'anomalies_detected' : 'normal'
  };
};

export default {
  getSeasonalityInsight,
  projectPromotionAwareDemand,
  getLeadTimeVariabilityInsight,
  getSupplierReliabilityScores,
  getDemandAnomalyInsight
};
