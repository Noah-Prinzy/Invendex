import mongoose from 'mongoose';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import { getDeadStockItems } from './finance/deadStockService.js';

const normalizeDays = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(365, Math.floor(parsed)));
};

const normalizeLimit = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(100, Math.floor(parsed)));
};

const getSinceDate = days => {
  const since = new Date();
  since.setDate(since.getDate() - normalizeDays(days));
  return since;
};

const getSalesAggregatePipeline = ({ organizationId, sinceDate }) => [
  {
    $match: {
      organization: new mongoose.Types.ObjectId(organizationId),
      type: 'sale',
      status: 'completed',
      createdAt: { $gte: sinceDate }
    }
  },
  { $unwind: '$products' },
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
  { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      productId: '$_id',
      sku: '$product.sku',
      name: '$product.name',
      quantitySold: 1,
      salesCount: 1,
      stock: '$product.stock'
    }
  }
];

export const getTopSellingItems = async ({
  organizationId,
  days = 30,
  limit = 10
}) => {
  const rows = await Order.aggregate([
    ...getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days)
    }),
    { $sort: { quantitySold: -1 } },
    { $limit: normalizeLimit(limit) }
  ]);

  return rows;
};

export const getTurnoverSkus = async ({
  organizationId,
  days = 30,
  limit = 20
}) => {
  const rows = await Order.aggregate(
    getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days)
    })
  );

  const turnover = rows.map(row => {
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
  limit = 20
}) => {
  const rows = await Order.aggregate(
    getSalesAggregatePipeline({
      organizationId,
      sinceDate: getSinceDate(days)
    })
  );

  const slowMoving = rows
    .map(row => {
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
    .filter(row => row.stock > 0);

  slowMoving.sort((a, b) => a.velocityPerDay - b.velocityPerDay);
  return slowMoving.slice(0, normalizeLimit(limit));
};

export const getStockAgingBuckets = async ({ organizationId }) => {
  const now = new Date();
  const rows = await Inventory.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
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

  const items = rows.map(row => {
    const movementDate = row.lastMovementAt ? new Date(row.lastMovementAt) : now;
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
  days = 180
}) => {
  const since = getSinceDate(days);
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);

  const [suppliers, poStats] = await Promise.all([
    Supplier.find({ organization: organizationId, isActive: true })
      .select('_id name')
      .lean(),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationObjectId,
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
              $divide: [{ $subtract: ['$receivedAt', '$sentAt'] }, 1000 * 60 * 60 * 24]
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

  const poMap = new Map(poStats.map(row => [String(row._id), row]));
  const ranking = suppliers.map(supplier => {
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
      Math.min(100, onTimeRate * 0.7 + Math.max(0, 100 - avgLeadTimeDays * 5) * 0.3)
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

export default {
  getTopSellingItems,
  getTurnoverSkus,
  getSlowMovingSkus,
  getStockAgingBuckets,
  getSupplierPerformanceRanking,
  getDeadStockIntelligence
};
