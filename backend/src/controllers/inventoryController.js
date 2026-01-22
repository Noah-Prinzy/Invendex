import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import SupplierProduct from '../models/SupplierProduct.js';
import { runReorderEngine } from '../services/reorderEngine.js';
import {
  getAverageDailyDemandPerSku
} from '../services/inventoryMetricsService.js';

/* =========================
   EXISTING CONTROLLERS
   ========================= */

export const getProductInventoryTrend = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const filter = { product: req.params.productId };

    if (from || to) {
      filter.recordedAt = {};
      if (from) filter.recordedAt.$gte = new Date(from);
      if (to) filter.recordedAt.$lte = new Date(to);
    }

    const snapshots = await InventorySnapshot.find(filter)
      .sort({ recordedAt: 1 })
      .select('stock price recordedAt source');

    if (!snapshots.length) {
      throw new AppError('No inventory data found', 404);
    }

    return successResponse(
      res,
      snapshots,
      'Product inventory trend fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const getDailyInventorySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const summary = await InventorySnapshot.aggregate([
      { $match: { recordedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$sku',
          totalStock: { $last: '$stock' },
          price: { $last: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          sku: '$_id',
          totalStock: 1,
          inventoryValue: { $multiply: ['$totalStock', '$price'] }
        }
      }
    ]);

    return successResponse(res, summary, 'Daily inventory summary fetched');
  } catch (err) {
    next(err);
  }
};

export const getInventoryDrops = async (req, res, next) => {
  try {
    const drops = await InventorySnapshot.aggregate([
      { $sort: { recordedAt: 1 } },
      {
        $group: {
          _id: '$product',
          snapshots: {
            $push: {
              stock: '$stock',
              recordedAt: '$recordedAt',
              sku: '$sku'
            }
          }
        }
      },
      { $unwind: '$snapshots' },
      {
        $setWindowFields: {
          partitionBy: '$_id',
          sortBy: { 'snapshots.recordedAt': 1 },
          output: {
            previousStock: {
              $shift: { output: '$snapshots.stock', by: -1 }
            }
          }
        }
      },
      {
        $match: {
          $expr: { $lt: ['$snapshots.stock', '$previousStock'] }
        }
      },
      {
        $project: {
          _id: 0,
          product: '$_id',
          sku: '$snapshots.sku',
          previousStock: 1,
          currentStock: '$snapshots.stock',
          recordedAt: '$snapshots.recordedAt',
          drop: {
            $subtract: ['$previousStock', '$snapshots.stock']
          }
        }
      }
    ]);

    return successResponse(res, drops, 'Inventory drops detected');
  } catch (err) {
    next(err);
  }
};

export const getReorderIntelligence = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;

    const avgDemandPerSku = await getAverageDailyDemandPerSku(days);

    const products = await Product.find({ isActive: true })
      .select('_id sku stock')
      .lean();

    // Fetch supplier links once
    const supplierLinks = await SupplierProduct.find({
      isActive: true
    })
      .populate('supplier', 'name leadTimeDays')
      .lean();

    const intelligence = products.map(product => {
      const avgDailyDemand = avgDemandPerSku[product.sku] || 0;

      const productSuppliers = supplierLinks.filter(
        link => link.product.toString() === product._id.toString()
      );

      // Preferred supplier → fallback to shortest lead time
      const supplierLink =
        productSuppliers.find(s => s.isPreferred) ||
        productSuppliers.sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];

      if (!supplierLink) {
        return {
          sku: product.sku,
          currentStock: product.stock,
          avgDailyDemand,
          supplier: null,
          leadTimeDays: null,
          reorderPoint: null,
          needsReorder: false,
          status: 'NO_SUPPLIER'
        };
      }

      const leadTimeDays =
        supplierLink.leadTimeDays ??
        supplierLink.supplier?.leadTimeDays ??
        7;

      const leadTimeDemand = avgDailyDemand * leadTimeDays;
      const safetyStock = leadTimeDemand * 0.2;
      const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

      return {
        sku: product.sku,
        currentStock: product.stock,
        avgDailyDemand,
        leadTimeDays,
        supplier: {
          id: supplierLink.supplier?._id,
          name: supplierLink.supplier?.name
        },
        unitCost: supplierLink.unitCost,
        safetyStock: Math.ceil(safetyStock),
        reorderPoint,
        needsReorder: product.stock <= reorderPoint
      };
    });

    return successResponse(
      res,
      intelligence,
      'Supplier-aware reorder intelligence generated'
    );
  } catch (err) {
    next(err);
  }
};

export const getActiveReorderAlerts = async (req, res, next) => {
  try {
    const alerts = await ReorderAlert.find({ resolved: false })
      .sort({ triggeredAt: -1 })
      .populate('product', 'sku name')
      .populate('supplier', 'name email phone');

    return successResponse(
      res,
      alerts,
      'Active reorder alerts fetched'
    );
  } catch (err) {
    next(err);
  }
};

export const getResolvedReorderAlerts = async (req, res, next) => {
  try {
    const alerts = await ReorderAlert.find({ resolved: true })
      .sort({ resolvedAt: -1 })
      .populate('product', 'sku name')
      .populate('supplier', 'name email phone');

    return successResponse(
      res,
      alerts,
      'Resolved reorder alerts fetched'
    );
  } catch (err) {
    next(err);
  }
};

/* =========================
   A18.18.3 — DASHBOARD AGGREGATIONS
   ========================= */

/**
 * 📊 Reorder Alert KPIs
 */
export const getReorderAlertKPIs = async (req, res, next) => {
  try {
    const [stats] = await ReorderAlert.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] }
                },
                resolved: {
                  $sum: { $cond: [{ $eq: ['$resolved', true] }, 1, 0] }
                }
              }
            }
          ],
          resolutionTimes: [
            { $match: { resolved: true, resolvedAt: { $ne: null } } },
            {
              $project: {
                resolutionHours: {
                  $divide: [
                    { $subtract: ['$resolvedAt', '$triggeredAt'] },
                    1000 * 60 * 60
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgResolutionTimeHours: { $avg: '$resolutionHours' }
              }
            }
          ],
          aging: [
            { $match: { resolved: false } },
            {
              $project: {
                daysOpen: {
                  $divide: [
                    { $subtract: [new Date(), '$triggeredAt'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                oldestUnresolvedDays: { $max: '$daysOpen' }
              }
            }
          ]
        }
      }
    ]);

    const totals = stats.totals[0] || {
      total: 0,
      active: 0,
      resolved: 0
    };

    const avgResolutionTimeHours =
      stats.resolutionTimes[0]?.avgResolutionTimeHours || 0;

    const oldestUnresolvedDays =
      stats.aging[0]?.oldestUnresolvedDays || 0;

    return successResponse(
      res,
      {
        ...totals,
        avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10,
        oldestUnresolvedDays: Math.floor(oldestUnresolvedDays)
      },
      'Reorder alert KPIs fetched'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📦 Active reorder alerts grouped by SKU
 */
export const getActiveAlertsBySku = async (req, res, next) => {
  try {
    const data = await ReorderAlert.aggregate([
      { $match: { resolved: false } },
      {
        $group: {
          _id: '$sku',
          alertCount: { $sum: 1 },
          lastTriggeredAt: { $max: '$triggeredAt' },
          stock: { $last: '$stock' },
          reorderLevel: { $last: '$reorderLevel' }
        }
      },
      {
        $project: {
          _id: 0,
          sku: '$_id',
          alertCount: 1,
          lastTriggeredAt: 1,
          stock: 1,
          reorderLevel: 1
        }
      },
      { $sort: { alertCount: -1 } }
    ]);

    return successResponse(
      res,
      data,
      'Active reorder alerts grouped by SKU'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📈 Reorder alert trend (daily)
 */
export const getReorderAlertTrend = async (req, res, next) => {
  try {
    const trend = await ReorderAlert.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$triggeredAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    return successResponse(
      res,
      trend,
      'Reorder alert trend fetched'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 🏭 Reorder alerts grouped by supplier
 */
export const getReorderAlertsBySupplier = async (req, res, next) => {
  try {
    const data = await ReorderAlert.aggregate([
      { $match: { resolved: false, supplier: { $ne: null } } },
      {
        $group: {
          _id: '$supplier',
          alertCount: { $sum: 1 },
          avgLeadTimeDays: { $avg: '$supplierLeadTimeDays' },
          totalExposureValue: {
            $sum: {
              $multiply: ['$supplierUnitCost', '$reorderLevel']
            }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      {
        $project: {
          _id: 0,
          supplierId: '$supplier._id',
          supplierName: '$supplier.name',
          alertCount: 1,
          avgLeadTimeDays: { $round: ['$avgLeadTimeDays', 1] },
          totalExposureValue: 1
        }
      },
      { $sort: { alertCount: -1 } }
    ]);

    return successResponse(
      res,
      data,
      'Reorder alerts grouped by supplier'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * ⏳ Aging unresolved reorder alerts
 */
export const getReorderAlertAging = async (req, res, next) => {
  try {
    const alerts = await ReorderAlert.aggregate([
      { $match: { resolved: false } },
      {
        $project: {
          sku: 1,
          supplier: 1,
          triggeredAt: 1,
          daysOpen: {
            $divide: [
              { $subtract: [new Date(), '$triggeredAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      { $sort: { daysOpen: -1 } }
    ]);

    return successResponse(
      res,
      alerts,
      'Reorder alert aging fetched'
    );
  } catch (err) {
    next(err);
  }
};

/* =========================
   A19.2.3.1 — MANUAL REORDER ALERT ACTIONS
   ========================= */

/**
 * ➕ Manually create reorder alert
 */
export const createManualReorderAlert = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      throw new AppError('Product not found or inactive', 404);
    }

    // ❗ Prevent duplicate unresolved alerts
    const existingAlert = await ReorderAlert.findOne({
      product: product._id,
      resolved: false
    });

    if (existingAlert) {
      throw new AppError(
        'Active reorder alert already exists for this product',
        409
      );
    }

    // 🔍 Pick best supplier snapshot
    const supplierLink = await SupplierProduct.findOne({
      product: product._id,
      isActive: true
    })
      .sort({ isPreferred: -1, leadTimeDays: 1 })
      .lean();

    const alert = await ReorderAlert.create({
      product: product._id,
      sku: product.sku,
      stock: product.stock,
      reorderLevel: product.reorderLevel,
      triggeredAt: new Date(),
      source: 'manual',

      supplier: supplierLink?.supplier || null,
      supplierLeadTimeDays: supplierLink?.leadTimeDays || null,
      supplierUnitCost: supplierLink?.unitCost || null
    });

    return successResponse(
      res,
      alert,
      'Manual reorder alert created'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ Resolve reorder alert manually
 */
export const resolveReorderAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { resolutionReason } = req.body;

    const alert = await ReorderAlert.findById(alertId);
    if (!alert) {
      throw new AppError('Reorder alert not found', 404);
    }

    if (alert.resolved) {
      throw new AppError('Reorder alert already resolved', 400);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason = resolutionReason || 'Manual resolution';
    alert.resolvedBy = req.user._id;

    await alert.save();

    return successResponse(
      res,
      alert,
      'Reorder alert resolved successfully'
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 🤖 A29 — Demand-aware automatic reorder alert generation
 */
export const runAutomaticReorderAlerts = async (req, res, next) => {
  try {
    const alerts = await runReorderEngine({
      triggeredBy: req.user?._id || 'SYSTEM'
    });

    return successResponse(
      res,
      {
        generated: alerts.length,
        alerts
      },
      'Demand-aware reorder engine executed'
    );
  } catch (err) {
    next(err);
  }
};