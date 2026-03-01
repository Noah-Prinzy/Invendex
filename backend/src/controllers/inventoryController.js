import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';
import SupplierProduct from '../models/SupplierProduct.js';
import mongoose from 'mongoose';
import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';
import { runReorderEngine } from '../services/reorderEngine.js';
import { getAverageDailyDemandPerSku } from '../services/inventoryMetricsService.js';
import {
  approveStocktakeSession,
  createStocktakeSession,
  getStocktakeSessionById,
  listStocktakeSessions,
  submitStocktakeCounts
} from '../services/inventory/stocktakeService.js';

/* ======================================================
   INVENTORY SNAPSHOTS
====================================================== */

export const getProductInventoryTrend = async (req, res, next) => {
  try {
    const snapshots = await InventorySnapshot.find({
      organization: req.organizationId,
      product: req.params.productId
    }).sort({ recordedAt: 1 });

    if (!snapshots.length) {
      throw new AppError('No inventory data found', 404);
    }

    return successResponse(res, snapshots, 'Product inventory trend fetched');
  } catch (err) {
    next(err);
  }
};

export const getDailyInventorySummary = async (req, res, next) => {
  try {
    const summary = await InventorySnapshot.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId)
        }
      },
      {
        $group: {
          _id: '$sku',
          stock: { $last: '$stock' },
          price: { $last: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          sku: '$_id',
          stock: 1,
          inventoryValue: { $multiply: ['$stock', '$price'] }
        }
      }
    ]);

    return successResponse(res, summary, 'Daily inventory summary fetched');
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   REORDER INTELLIGENCE
====================================================== */

export const getReorderIntelligence = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const avgDemandPerSku = await getAverageDailyDemandPerSku(
      days,
      null,
      req.organizationId
    );

    const products = await Product.find({
      organization: req.organizationId,
      isActive: true
    }).lean();
    const supplierLinks = await SupplierProduct.find({
      organization: req.organizationId,
      isActive: true
    })
      .populate('supplier', 'name leadTimeDays')
      .lean();

    const intelligence = products.map((product) => {
      const avgDailyDemand = avgDemandPerSku[product.sku] || 0;

      const supplierLink =
        supplierLinks.find(
          (s) => s.product.toString() === product._id.toString()
        ) || null;

      if (!supplierLink) {
        return {
          sku: product.sku,
          currentStock: product.stock,
          status: 'NO_SUPPLIER'
        };
      }

      const leadTimeDays =
        supplierLink.leadTimeDays || supplierLink.supplier?.leadTimeDays || 7;

      const reorderPoint = Math.ceil(avgDailyDemand * leadTimeDays * 1.2);

      return {
        sku: product.sku,
        currentStock: product.stock,
        avgDailyDemand,
        leadTimeDays,
        reorderPoint,
        needsReorder: product.stock <= reorderPoint
      };
    });

    return successResponse(res, intelligence, 'Reorder intelligence generated');
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   REORDER ALERTS
====================================================== */

export const getActiveReorderAlerts = async (req, res, next) => {
  try {
    const alerts = await ReorderAlert.find({
      organization: req.organizationId,
      resolved: false
    })
      .sort({ triggeredAt: -1 })
      .populate('product', 'sku name')
      .populate('supplier', 'name');

    return successResponse(res, alerts, 'Active reorder alerts fetched');
  } catch (err) {
    next(err);
  }
};

export const getResolvedReorderAlerts = async (req, res, next) => {
  try {
    const alerts = await ReorderAlert.find({
      organization: req.organizationId,
      resolved: true
    }).sort({ resolvedAt: -1 });

    return successResponse(res, alerts, 'Resolved reorder alerts fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 📉 Inventory drops
 */
export const getInventoryDrops = async (req, res, next) => {
  try {
    const drops = await InventorySnapshot.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId)
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$product',
          snapshots: {
            $push: {
              stock: '$stock',
              createdAt: '$createdAt'
            }
          }
        }
      },
      {
        $project: {
          drops: {
            $map: {
              input: {
                $range: [0, { $subtract: [{ $size: '$snapshots' }, 1] }]
              },
              as: 'idx',
              in: {
                drop: {
                  $subtract: [
                    { $arrayElemAt: ['$snapshots.stock', '$$idx'] },
                    {
                      $arrayElemAt: ['$snapshots.stock', { $add: ['$$idx', 1] }]
                    }
                  ]
                },
                date: {
                  $arrayElemAt: ['$snapshots.createdAt', '$$idx']
                }
              }
            }
          }
        }
      },
      { $unwind: '$drops' },
      { $match: { 'drops.drop': { $gte: 10 } } },
      {
        $project: {
          product: '$_id',
          drop: '$drops.drop',
          date: '$drops.date'
        }
      }
    ]);

    return successResponse(res, drops, 'Inventory drops detected');
  } catch (err) {
    next(err);
  }
};

/**
 * 🧠 Manual reorder alert
 */
export const createManualReorderAlert = async (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = await Product.findOne({
      _id: productId,
      organization: req.organizationId
    });
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // ❗ Prevent duplicate ACTIVE alert today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const exists = await ReorderAlert.findOne({
      organization: req.organizationId,
      product: product._id,
      resolved: false,
      triggeredAt: { $gte: startOfDay }
    });

    if (exists) {
      throw new AppError('Active reorder alert already exists today', 409);
    }

    const supplierLink = await SupplierProduct.findOne({
      organization: req.organizationId,
      product: product._id,
      isActive: true
    }).lean();

    const alert = await ReorderAlert.create({
      organization: req.organizationId,
      product: product._id,
      sku: product.sku,
      stock: product.stock,
      reorderLevel: product.lowStockThreshold,
      triggeredAt: new Date(),
      source: 'manual',
      supplier: supplierLink?.supplier || null,
      supplierLeadTimeDays: supplierLink?.leadTimeDays || null,
      supplierUnitCost: supplierLink?.unitCost || null
    });

    return successResponse(res, alert, 'Manual reorder alert created');
  } catch (err) {
    next(err);
  }
};

export const resolveReorderAlert = async (req, res, next) => {
  try {
    const alert = await ReorderAlert.findOne({
      _id: req.params.alertId,
      organization: req.organizationId
    });
    if (!alert) {
      throw new AppError('Reorder alert not found', 404);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    return successResponse(res, alert, 'Reorder alert resolved');
  } catch (err) {
    next(err);
  }
};

export const runAutomaticReorderAlerts = async (req, res, next) => {
  try {
    const engineResult = await runReorderEngine({
      triggeredBy: req.user?._id || 'system',
      source: 'system',
      organizationId: req.organizationId
    });

    return successResponse(
      res,
      { generated: engineResult.generated, alerts: engineResult.alerts },
      'Reorder engine executed'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📦 Active alerts grouped by SKU
 */
export const getActiveAlertsBySku = async (req, res, next) => {
  try {
    const data = await ReorderAlert.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId),
          resolved: false
        }
      },
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
      }
    ]);

    return successResponse(res, data, 'Active alerts by SKU');
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
        $match: {
          organization: new mongoose.Types.ObjectId(req.organizationId)
        }
      },
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

    return successResponse(res, trend, 'Reorder alert trend fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * 📊 Reorder KPIs
 */
export const getReorderAlertKPIs = async (req, res, next) => {
  try {
    const [
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      forecastAlerts,
      staticAlerts,
      convertedAlerts
    ] = await Promise.all([
      ReorderAlert.countDocuments({ organization: req.organizationId }),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        resolved: false
      }),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        resolved: true
      }),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        source: 'forecast'
      }),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        source: 'static'
      }),
      ReorderAlert.countDocuments({
        organization: req.organizationId,
        usedInPurchaseOrder: true
      })
    ]);

    return successResponse(
      res,
      {
        totalAlerts,
        activeAlerts,
        resolvedAlerts,
        forecastAlerts,
        staticAlerts,
        convertedAlerts
      },
      'Reorder alert KPIs retrieved'
    );
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   STOCKTAKE / CYCLE COUNT
====================================================== */

export const createInventoryStocktakeSession = async (req, res, next) => {
  try {
    const { warehouseId, title, notes, productIds } = req.body;

    const session = await createStocktakeSession({
      organizationId: req.organizationId,
      warehouseId,
      title,
      notes,
      productIds,
      createdBy: req.user?._id
    });

    return successResponse(res, session, 'Stocktake session created', 201);
  } catch (error) {
    next(error);
  }
};

export const listInventoryStocktakeSessions = async (req, res, next) => {
  try {
    const sessions = await listStocktakeSessions({
      organizationId: req.organizationId,
      warehouseId: req.query?.warehouseId || null,
      status: req.query?.status || null,
      limit: req.query?.limit || 50
    });

    return successResponse(res, sessions, 'Stocktake sessions fetched');
  } catch (error) {
    next(error);
  }
};

export const getInventoryStocktakeSession = async (req, res, next) => {
  try {
    const session = await getStocktakeSessionById({
      organizationId: req.organizationId,
      stocktakeSessionId: req.params.sessionId
    });

    return successResponse(res, session, 'Stocktake session fetched');
  } catch (error) {
    next(error);
  }
};

export const submitInventoryStocktakeCounts = async (req, res, next) => {
  try {
    const session = await submitStocktakeCounts({
      organizationId: req.organizationId,
      stocktakeSessionId: req.params.sessionId,
      counts: req.body?.counts || [],
      actorUserId: req.user?._id || null
    });

    return successResponse(res, session, 'Stocktake counts recorded');
  } catch (error) {
    next(error);
  }
};

export const approveInventoryStocktakeSession = async (req, res, next) => {
  try {
    const session = await approveStocktakeSession({
      organizationId: req.organizationId,
      stocktakeSessionId: req.params.sessionId,
      actorUserId: req.user?._id || null,
      actorRole: req.user?.role || null
    });

    return successResponse(res, session, 'Stocktake session approved');
  } catch (error) {
    next(error);
  }
};
