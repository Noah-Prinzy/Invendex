import mongoose from 'mongoose';
import BinInventory from '../models/BinInventory.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';
import { getDeadStockItems } from './finance/deadStockService.js';

const normalizeDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(365, Math.floor(parsed)));
};

const normalizeLimit = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
};

const getSinceDate = (days) => {
  const since = new Date();
  since.setDate(since.getDate() - normalizeDays(days));
  return since;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getPriorityWeight = (priority) => {
  const normalized = String(priority || '').toLowerCase();
  if (normalized === 'critical') return 4;
  if (normalized === 'high') return 3;
  if (normalized === 'medium') return 2;
  return 1;
};

const toObjectId = (value) => {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

const getSalesAggregatePipeline = ({
  organizationId,
  sinceDate,
  warehouseId = null
}) => {
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const warehouseObjectId = warehouseId ? toObjectId(warehouseId) : null;

  const pipeline = [
    {
      $match: {
        organization: organizationObjectId,
        type: 'sale',
        status: 'completed',
        createdAt: { $gte: sinceDate }
      }
    },
    { $unwind: '$products' }
  ];

  if (warehouseObjectId) {
    pipeline.push({
      $match: {
        $or: [
          { 'products.warehouse': warehouseObjectId },
          { warehouse: warehouseObjectId }
        ]
      }
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$products.product',
        quantitySold: { $sum: '$products.quantity' },
        salesCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
  );

  if (warehouseObjectId) {
    pipeline.push(
      {
        $lookup: {
          from: 'inventories',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$organization', organizationObjectId] },
                    { $eq: ['$product', '$$productId'] },
                    { $eq: ['$warehouse', warehouseObjectId] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 0,
                quantityOnHand: 1
              }
            }
          ],
          as: 'inventoryRows'
        }
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          sku: '$product.sku',
          name: '$product.name',
          quantitySold: 1,
          salesCount: 1,
          stock: {
            $ifNull: [{ $first: '$inventoryRows.quantityOnHand' }, 0]
          }
        }
      }
    );
  } else {
    pipeline.push({
      $project: {
        _id: 0,
        productId: '$_id',
        sku: '$product.sku',
        name: '$product.name',
        quantitySold: 1,
        salesCount: 1,
        stock: '$product.stock'
      }
    });
  }

  return pipeline;
};

export const getTopSellingItems = async ({
  organizationId,
  days = 30,
  limit = 10,
  warehouseId = null
}) => {
  const rows = await Order.aggregate([
    ...getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days),
      warehouseId
    }),
    { $sort: { quantitySold: -1 } },
    { $limit: normalizeLimit(limit) }
  ]);

  return rows;
};

export const getTurnoverSkus = async ({
  organizationId,
  days = 30,
  limit = 20,
  warehouseId = null
}) => {
  const rows = await Order.aggregate(
    getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days),
      warehouseId
    })
  );

  const turnover = rows.map((row) => {
    const currentStock = Math.max(Number(row.stock) || 0, 0);
    const denominator = Math.max(currentStock, 1);
    const turnoverRatio = row.quantitySold / denominator;

    return {
      ...row,
      turnoverRatio: Number(turnoverRatio.toFixed(2))
    };
  });

  turnover.sort((a, b) => b.turnoverRatio - a.turnoverRatio);
  return turnover.slice(0, normalizeLimit(limit));
};

export const getSlowMovingSkus = async ({
  organizationId,
  days = 60,
  limit = 20,
  warehouseId = null
}) => {
  const rows = await Order.aggregate(
    getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days),
      warehouseId
    })
  );

  const slowMoving = rows
    .map((row) => {
      const currentStock = Math.max(Number(row.stock) || 0, 0);
      const velocity = row.quantitySold / Math.max(normalizeDays(days), 1);

      return {
        ...row,
        velocityPerDay: Number(velocity.toFixed(2)),
        daysOfInventoryLeft:
          velocity > 0
            ? Number((currentStock / velocity).toFixed(1))
            : Number.POSITIVE_INFINITY
      };
    })
    .filter((row) => row.stock > 0);

  slowMoving.sort((a, b) => a.velocityPerDay - b.velocityPerDay);
  return slowMoving.slice(0, normalizeLimit(limit));
};

export const getStockAgingBuckets = async ({
  organizationId,
  warehouseId = null
}) => {
  const now = new Date();
  const warehouseObjectId = warehouseId ? toObjectId(warehouseId) : null;
  const rows = await Inventory.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        ...(warehouseObjectId ? { warehouse: warehouseObjectId } : {}),
        quantityOnHand: { $gt: 0 }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        productId: '$product._id',
        sku: '$product.sku',
        name: '$product.name',
        quantityOnHand: 1,
        lastMovementAt: 1
      }
    }
  ]);

  const summary = {
    bucket0to30: { skuCount: 0, quantity: 0 },
    bucket31to60: { skuCount: 0, quantity: 0 },
    bucket61to90: { skuCount: 0, quantity: 0 },
    bucket90plus: { skuCount: 0, quantity: 0 }
  };

  const items = rows.map((row) => {
    const movementDate = row.lastMovementAt
      ? new Date(row.lastMovementAt)
      : now;
    const ageDays = Math.floor((now - movementDate) / (1000 * 60 * 60 * 24));

    let bucket = 'bucket0to30';
    if (ageDays > 90) bucket = 'bucket90plus';
    else if (ageDays > 60) bucket = 'bucket61to90';
    else if (ageDays > 30) bucket = 'bucket31to60';

    summary[bucket].skuCount += 1;
    summary[bucket].quantity += row.quantityOnHand;

    return {
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      quantityOnHand: row.quantityOnHand,
      ageDays,
      bucket
    };
  });

  return {
    summary,
    items
  };
};

export const getSupplierPerformanceRanking = async ({
  organizationId,
  days = 180,
  warehouseId = null
}) => {
  const since = getSinceDate(days);
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const warehouseObjectId = warehouseId ? toObjectId(warehouseId) : null;

  const [suppliers, poStats] = await Promise.all([
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
          totalSpend: { $sum: '$totalCost' },
          avgLeadTimeDays: {
            $avg: {
              $divide: [
                { $subtract: ['$receivedAt', '$sentAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          onTimeOrders: {
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
    ])
  ]);

  const poMap = new Map(poStats.map((row) => [String(row._id), row]));
  const ranking = suppliers.map((supplier) => {
    const stats = poMap.get(String(supplier._id)) || {};
    const totalOrders = stats.totalOrders || 0;
    const totalSpend = stats.totalSpend || 0;
    const avgLeadTimeDays = Number((stats.avgLeadTimeDays || 0).toFixed(2));
    const onTimeRate =
      totalOrders > 0
        ? Number(((stats.onTimeOrders / totalOrders) * 100).toFixed(2))
        : 0;

    const score = Math.max(
      0,
      Math.min(
        100,
        onTimeRate * 0.7 + Math.max(0, 100 - avgLeadTimeDays * 5) * 0.3
      )
    );

    return {
      supplierId: supplier._id,
      supplierName: supplier.name,
      score: Number(score.toFixed(2)),
      totalOrders,
      totalSpend: Number(totalSpend.toFixed(2)),
      onTimeRate,
      avgLeadTimeDays
    };
  });

  ranking.sort((a, b) => b.score - a.score);
  return ranking;
};

export const getDeadStockIntelligence = async ({
  organizationId,
  days = 90,
  warehouseId = null,
  limit = 100
}) => {
  const report = await getDeadStockItems({
    organizationId,
    days,
    warehouseId
  });

  const parsedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));

  return {
    ...report,
    items: report.items.slice(0, parsedLimit)
  };
};

const getSalesMomentumByProduct = async ({
  organizationId,
  windowDays = 30,
  warehouseId = null
}) => {
  const normalizedWindow = normalizeDays(windowDays);
  const recentStart = getSinceDate(normalizedWindow);
  const previousStart = getSinceDate(normalizedWindow * 2);
  const warehouseObjectId = warehouseId ? toObjectId(warehouseId) : null;

  const pipeline = [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        type: 'sale',
        status: 'completed',
        createdAt: { $gte: previousStart }
      }
    },
    { $unwind: '$products' }
  ];

  if (warehouseObjectId) {
    pipeline.push({
      $match: {
        $or: [
          { 'products.warehouse': warehouseObjectId },
          { warehouse: warehouseObjectId }
        ]
      }
    });
  }

  pipeline.push({
    $group: {
      _id: '$products.product',
      recentQty: {
        $sum: {
          $cond: [
            { $gte: ['$createdAt', recentStart] },
            '$products.quantity',
            0
          ]
        }
      },
      previousQty: {
        $sum: {
          $cond: [
            {
              $and: [
                { $gte: ['$createdAt', previousStart] },
                { $lt: ['$createdAt', recentStart] }
              ]
            },
            '$products.quantity',
            0
          ]
        }
      }
    }
  });

  const rows = await Order.aggregate(pipeline);

  const map = new Map();
  for (const row of rows) {
    const productId = String(row?._id || '').trim();
    if (!productId) continue;
    const recentQty = toNumber(row?.recentQty, 0);
    const previousQty = toNumber(row?.previousQty, 0);
    const growthRatio =
      previousQty > 0 ? recentQty / previousQty : recentQty > 0 ? 9 : 1;
    map.set(productId, {
      recentQty,
      previousQty,
      growthRatio: Number(growthRatio.toFixed(2))
    });
  }

  return map;
};

export const getInventoryAdvisorRecommendations = async ({
  organizationId,
  days = 30,
  warehouseId = null,
  limit = 25
}) => {
  const normalizedDays = normalizeDays(days);
  const parsedLimit = normalizeLimit(limit);
  const inventoryMatch = {
    organization: new mongoose.Types.ObjectId(organizationId),
    quantityOnHand: { $gt: 0 }
  };
  if (warehouseId) {
    inventoryMatch.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const [inventoryRows, products, slowMoving, momentumMap, deadStockReport] =
    await Promise.all([
      Inventory.find(inventoryMatch)
        .select('product warehouse quantityOnHand lastMovementAt')
        .populate('warehouse', 'name code')
        .lean(),
      Product.find({
        organization: organizationId,
        isActive: true
      })
        .select('_id sku name lowStockThreshold price')
        .lean(),
      getSlowMovingSkus({
        organizationId,
        days: Math.max(normalizedDays, 60),
        limit: 400,
        warehouseId
      }),
      getSalesMomentumByProduct({
        organizationId,
        windowDays: normalizedDays,
        warehouseId
      }),
      getDeadStockItems({
        organizationId,
        days: Math.max(90, normalizedDays * 2),
        warehouseId
      })
    ]);

  const productMap = new Map(
    products.map((product) => [String(product._id), product])
  );
  const velocityMap = new Map(
    slowMoving.map((row) => [
      String(row.productId || ''),
      toNumber(row.velocityPerDay, 0)
    ])
  );
  const inventoryTotals = new Map();
  for (const row of inventoryRows) {
    const productId = String(row.product || '').trim();
    if (!productId) continue;
    const current = inventoryTotals.get(productId) || {
      quantityOnHand: 0,
      lastMovementAt: null,
      warehouseCode: row?.warehouse?.code || null
    };
    current.quantityOnHand += toNumber(row.quantityOnHand, 0);
    const movementDate = row?.lastMovementAt
      ? new Date(row.lastMovementAt)
      : null;
    if (
      movementDate &&
      !Number.isNaN(movementDate.getTime()) &&
      (!current.lastMovementAt ||
        movementDate > new Date(current.lastMovementAt))
    ) {
      current.lastMovementAt = movementDate.toISOString();
    }
    if (!current.warehouseCode && row?.warehouse?.code) {
      current.warehouseCode = row.warehouse.code;
    }
    inventoryTotals.set(productId, current);
  }

  const recommendations = [];

  for (const [productId, total] of inventoryTotals.entries()) {
    const product = productMap.get(productId);
    if (!product) continue;
    const quantityOnHand = toNumber(total.quantityOnHand, 0);
    const threshold = Math.max(toNumber(product.lowStockThreshold, 0), 1);
    const velocityPerDay = Math.max(toNumber(velocityMap.get(productId), 0), 0);
    const momentum = momentumMap.get(productId) || {
      recentQty: 0,
      previousQty: 0,
      growthRatio: 1
    };

    const expectedBuffer = Math.max(threshold * 4, 10);
    if (quantityOnHand > expectedBuffer && velocityPerDay <= 0.2) {
      const excess = Math.max(quantityOnHand - expectedBuffer, 0);
      const reducePct = Math.max(
        15,
        Math.min(70, Math.round((excess / Math.max(quantityOnHand, 1)) * 100))
      );
      const estimatedImpactValue = Number(
        (excess * toNumber(product.price, 0)).toFixed(2)
      );
      recommendations.push({
        id: `advisor-overstock-${productId}`,
        priority: quantityOnHand >= expectedBuffer * 1.8 ? 'high' : 'medium',
        actionType: 'OVERSTOCK_REDUCTION',
        productId,
        sku: product.sku || null,
        productName: product.name || null,
        warehouseCode: total.warehouseCode || null,
        confidenceScore: 0.78,
        estimatedImpactValue,
        summary: `${product.sku || 'SKU'} is overstocked`,
        recommendation: `Reduce next reorder quantity by about ${reducePct}% and pause auto-reorders until stock normalizes.`
      });
    }

    const lowCoverThreshold = Math.max(
      threshold * 3,
      Math.ceil(momentum.recentQty * 0.9)
    );
    if (
      momentum.recentQty >= 5 &&
      momentum.growthRatio >= 1.35 &&
      quantityOnHand <= lowCoverThreshold
    ) {
      const increasePct = Math.max(
        20,
        Math.min(80, Math.round((momentum.growthRatio - 1) * 100))
      );
      const priority =
        momentum.growthRatio >= 1.7 || quantityOnHand <= threshold
          ? 'high'
          : 'medium';
      recommendations.push({
        id: `advisor-demand-${productId}`,
        priority,
        actionType: 'DEMAND_UPSHIFT',
        productId,
        sku: product.sku || null,
        productName: product.name || null,
        warehouseCode: total.warehouseCode || null,
        confidenceScore: 0.74,
        estimatedImpactValue: Number(
          (
            toNumber(product.price, 0) *
            Math.max(momentum.recentQty - momentum.previousQty, 0)
          ).toFixed(2)
        ),
        summary: `${product.sku || 'SKU'} demand is increasing`,
        recommendation: `Increase reorder quantity by about ${increasePct}% and review lead time coverage for the next ${normalizedDays} days.`
      });
    }
  }

  const deadStockItems = Array.isArray(deadStockReport?.items)
    ? deadStockReport.items
    : [];
  for (const item of deadStockItems.slice(0, Math.min(12, parsedLimit))) {
    const ageDays = toNumber(item.ageDays, 0);
    const actionType =
      ageDays >= 180 ? 'SUPPLIER_RETURN_REVIEW' : 'PROMOTION_RESCUE';
    recommendations.push({
      id: `advisor-deadstock-${String(item.productId || item.sku || Math.random())}`,
      priority: ageDays >= 180 ? 'critical' : 'high',
      actionType,
      productId: item.productId ? String(item.productId) : null,
      sku: item.sku || null,
      productName: item.productName || null,
      warehouseCode: item.warehouseCode || null,
      confidenceScore: ageDays >= 180 ? 0.91 : 0.84,
      estimatedImpactValue: toNumber(item.inventoryValue, 0),
      summary: `${item.sku || 'SKU'} has stale inventory (${ageDays} days)`,
      recommendation:
        ageDays >= 180
          ? 'Prioritize supplier return/redeployment review and block fresh purchase orders for this SKU.'
          : 'Run a markdown or bundle campaign in the next cycle to unlock tied capital.'
    });
  }

  recommendations.sort((a, b) => {
    const byPriority =
      getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (byPriority !== 0) return byPriority;
    return (
      toNumber(b.estimatedImpactValue, 0) - toNumber(a.estimatedImpactValue, 0)
    );
  });

  const limitedRecommendations = recommendations.slice(0, parsedLimit);
  const totalEstimatedImpact = limitedRecommendations.reduce(
    (sum, row) => sum + toNumber(row.estimatedImpactValue, 0),
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    windowDays: normalizedDays,
    warehouseId: warehouseId || null,
    totals: {
      recommendations: limitedRecommendations.length,
      deadStockCapital: Number(
        toNumber(deadStockReport?.totalValue, 0).toFixed(2)
      ),
      estimatedImpactValue: Number(totalEstimatedImpact.toFixed(2))
    },
    recommendations: limitedRecommendations
  };
};

export const getDeadStockRescuePlan = async ({
  organizationId,
  days = 90,
  warehouseId = null,
  limit = 50
}) => {
  const parsedLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const report = await getDeadStockItems({
    organizationId,
    days,
    warehouseId
  });

  const actions = (Array.isArray(report.items) ? report.items : [])
    .slice(0, parsedLimit)
    .map((item) => {
      const ageDays = toNumber(item.ageDays, 0);
      let action = 'BUNDLE_PROMOTION';
      let suggestedDiscountPct = 12;

      if (ageDays >= 180) {
        action = 'RETURN_TO_SUPPLIER_OR_LIQUIDATE';
        suggestedDiscountPct = 30;
      } else if (ageDays >= 120) {
        action = 'DISCOUNT_AND_REPOSITION';
        suggestedDiscountPct = 22;
      } else if (ageDays >= 90) {
        action = 'BUNDLE_PROMOTION';
        suggestedDiscountPct = 15;
      }

      const recoverableValue = Number(
        (
          toNumber(item.inventoryValue, 0) *
          ((100 - suggestedDiscountPct) / 100)
        ).toFixed(2)
      );

      return {
        productId: item.productId ? String(item.productId) : null,
        sku: item.sku || null,
        productName: item.productName || null,
        warehouseId: item.warehouseId ? String(item.warehouseId) : null,
        warehouseCode: item.warehouseCode || null,
        ageDays,
        quantityOnHand: toNumber(item.quantityOnHand, 0),
        inventoryValue: toNumber(item.inventoryValue, 0),
        recommendedAction: action,
        suggestedDiscountPct,
        estimatedRecoverableValue: recoverableValue
      };
    });

  const actionSummary = actions.reduce((acc, row) => {
    const key = String(row.recommendedAction || 'UNKNOWN');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalRecoverableValue = actions.reduce(
    (sum, row) => sum + toNumber(row.estimatedRecoverableValue, 0),
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    thresholdDays: Number(report.thresholdDays || days),
    warehouseId: warehouseId || null,
    totals: {
      items: actions.length,
      inventoryValue: Number(toNumber(report.totalValue, 0).toFixed(2)),
      estimatedRecoverableValue: Number(totalRecoverableValue.toFixed(2))
    },
    actionSummary,
    actions
  };
};

const resolveUtilizationBand = (utilizationPct) => {
  if (!Number.isFinite(utilizationPct)) return 'UNKNOWN';
  if (utilizationPct >= 100) return 'OVER_CAPACITY';
  if (utilizationPct >= 85) return 'DENSE';
  if (utilizationPct <= 15) return 'LOW';
  return 'BALANCED';
};

export const getWarehouseDigitalTwin = async ({
  organizationId,
  warehouseId = null,
  zoneLimit = 12,
  binLimitPerZone = 120
}) => {
  const organizationObjectId = toObjectId(organizationId);
  if (!organizationObjectId) {
    return {
      generatedAt: new Date().toISOString(),
      warehouseId: warehouseId || null,
      totals: {
        warehouses: 0,
        zones: 0,
        bins: 0,
        unitsBinned: 0,
        unitsUnbinned: 0,
        utilizationPct: 0
      },
      warehouses: []
    };
  }

  const warehouseFilter = {
    organization: organizationObjectId,
    isArchived: { $ne: true }
  };
  if (warehouseId) {
    const parsedWarehouseId = toObjectId(warehouseId);
    if (!parsedWarehouseId) {
      return {
        generatedAt: new Date().toISOString(),
        warehouseId,
        totals: {
          warehouses: 0,
          zones: 0,
          bins: 0,
          unitsBinned: 0,
          unitsUnbinned: 0,
          utilizationPct: 0
        },
        warehouses: []
      };
    }
    warehouseFilter._id = parsedWarehouseId;
  }

  const [warehouses, bins] = await Promise.all([
    Warehouse.find(warehouseFilter).select('_id name code').lean(),
    WarehouseBin.find({
      organization: organizationObjectId,
      isActive: true,
      ...(warehouseId ? { warehouse: toObjectId(warehouseId) } : {})
    })
      .select(
        '_id warehouse code zone aisle rack shelf binType maxCapacityUnits updatedAt'
      )
      .lean()
  ]);

  if (!warehouses.length) {
    return {
      generatedAt: new Date().toISOString(),
      warehouseId: warehouseId || null,
      totals: {
        warehouses: 0,
        zones: 0,
        bins: 0,
        unitsBinned: 0,
        unitsUnbinned: 0,
        utilizationPct: 0
      },
      warehouses: []
    };
  }

  const warehouseIds = warehouses.map((warehouse) => warehouse._id);
  const [binStockRows, inventoryRows] = await Promise.all([
    BinInventory.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          warehouse: { $in: warehouseIds }
        }
      },
      {
        $group: {
          _id: '$bin',
          quantityOnHand: { $sum: '$quantityOnHand' },
          quantityReserved: { $sum: '$quantityReserved' }
        }
      }
    ]),
    Inventory.aggregate([
      {
        $match: {
          organization: organizationObjectId,
          warehouse: { $in: warehouseIds }
        }
      },
      {
        $group: {
          _id: '$warehouse',
          quantityOnHand: { $sum: '$quantityOnHand' },
          quantityReserved: { $sum: '$quantityReserved' }
        }
      }
    ])
  ]);

  const binStockMap = new Map(
    binStockRows.map((row) => [
      String(row._id),
      {
        quantityOnHand: toNumber(row.quantityOnHand, 0),
        quantityReserved: toNumber(row.quantityReserved, 0)
      }
    ])
  );
  const inventoryMap = new Map(
    inventoryRows.map((row) => [
      String(row._id),
      {
        quantityOnHand: toNumber(row.quantityOnHand, 0),
        quantityReserved: toNumber(row.quantityReserved, 0)
      }
    ])
  );

  const binsByWarehouse = new Map();
  for (const bin of bins) {
    const key = String(bin.warehouse);
    const existing = binsByWarehouse.get(key) || [];
    existing.push(bin);
    binsByWarehouse.set(key, existing);
  }

  const normalizedZoneLimit = Math.max(
    1,
    Math.min(Number(zoneLimit) || 12, 30)
  );
  const normalizedBinLimitPerZone = Math.max(
    1,
    Math.min(Number(binLimitPerZone) || 120, 300)
  );

  let totalZones = 0;
  let totalBins = 0;
  let totalUnitsBinned = 0;
  let totalUnitsUnbinned = 0;
  let totalCapacity = 0;
  let totalUtilizedForCapacity = 0;

  const warehouseRows = warehouses.map((warehouse) => {
    const warehouseKey = String(warehouse._id);
    const warehouseBins = binsByWarehouse.get(warehouseKey) || [];
    const zoneMap = new Map();
    let warehouseBinnedOnHand = 0;

    for (const bin of warehouseBins) {
      const stock = binStockMap.get(String(bin._id)) || {
        quantityOnHand: 0,
        quantityReserved: 0
      };
      const quantityOnHand = toNumber(stock.quantityOnHand, 0);
      const quantityReserved = toNumber(stock.quantityReserved, 0);
      const available = Math.max(quantityOnHand - quantityReserved, 0);
      const capacity = toNumber(bin.maxCapacityUnits, 0);
      const utilizationPct =
        capacity > 0
          ? Number(((quantityOnHand / Math.max(capacity, 1)) * 100).toFixed(2))
          : null;

      const zoneKey = String(bin.zone || 'UNSPECIFIED').trim() || 'UNSPECIFIED';
      const zone = zoneMap.get(zoneKey) || {
        zone: zoneKey,
        bins: [],
        totals: {
          bins: 0,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          maxCapacityUnits: 0
        }
      };

      zone.bins.push({
        binId: String(bin._id),
        code: bin.code,
        binType: bin.binType,
        aisle: bin.aisle || null,
        rack: bin.rack || null,
        shelf: bin.shelf || null,
        quantityOnHand,
        quantityReserved,
        quantityAvailable: available,
        maxCapacityUnits: capacity > 0 ? capacity : null,
        utilizationPct,
        utilizationBand: resolveUtilizationBand(utilizationPct)
      });
      zone.totals.bins += 1;
      zone.totals.quantityOnHand += quantityOnHand;
      zone.totals.quantityReserved += quantityReserved;
      zone.totals.quantityAvailable += available;
      zone.totals.maxCapacityUnits += capacity > 0 ? capacity : 0;
      zoneMap.set(zoneKey, zone);

      warehouseBinnedOnHand += quantityOnHand;
      if (capacity > 0) {
        totalCapacity += capacity;
        totalUtilizedForCapacity += quantityOnHand;
      }
    }

    const warehouseInventory = inventoryMap.get(warehouseKey) || {
      quantityOnHand: 0,
      quantityReserved: 0
    };
    const warehouseOnHand = toNumber(warehouseInventory.quantityOnHand, 0);
    const warehouseReserved = toNumber(warehouseInventory.quantityReserved, 0);
    const warehouseAvailable = Math.max(warehouseOnHand - warehouseReserved, 0);
    const unbinnedUnits = Math.max(warehouseOnHand - warehouseBinnedOnHand, 0);

    const zones = Array.from(zoneMap.values())
      .sort((a, b) => {
        if (a.zone === 'UNSPECIFIED') return 1;
        if (b.zone === 'UNSPECIFIED') return -1;
        return a.zone.localeCompare(b.zone);
      })
      .slice(0, normalizedZoneLimit)
      .map((zone) => ({
        ...zone,
        bins: zone.bins
          .sort((a, b) => a.code.localeCompare(b.code))
          .slice(0, normalizedBinLimitPerZone)
      }));

    totalZones += zones.length;
    totalBins += warehouseBins.length;
    totalUnitsBinned += warehouseBinnedOnHand;
    totalUnitsUnbinned += unbinnedUnits;

    return {
      warehouseId: warehouseKey,
      warehouseCode: warehouse.code || null,
      warehouseName: warehouse.name || null,
      totals: {
        bins: warehouseBins.length,
        zones: zones.length,
        quantityOnHand: Number(warehouseOnHand.toFixed(2)),
        quantityReserved: Number(warehouseReserved.toFixed(2)),
        quantityAvailable: Number(warehouseAvailable.toFixed(2)),
        quantityBinned: Number(warehouseBinnedOnHand.toFixed(2)),
        quantityUnbinned: Number(unbinnedUnits.toFixed(2))
      },
      zones
    };
  });

  const utilizationPct =
    totalCapacity > 0
      ? Number(
          (
            (totalUtilizedForCapacity / Math.max(totalCapacity, 1)) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    warehouseId: warehouseId || null,
    totals: {
      warehouses: warehouseRows.length,
      zones: totalZones,
      bins: totalBins,
      unitsBinned: Number(totalUnitsBinned.toFixed(2)),
      unitsUnbinned: Number(totalUnitsUnbinned.toFixed(2)),
      utilizationPct
    },
    warehouses: warehouseRows
  };
};

export default {
  getTopSellingItems,
  getTurnoverSkus,
  getSlowMovingSkus,
  getStockAgingBuckets,
  getSupplierPerformanceRanking,
  getDeadStockIntelligence,
  getInventoryAdvisorRecommendations,
  getDeadStockRescuePlan,
  getWarehouseDigitalTwin
};
