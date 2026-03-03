import PurchaseOrder from '../models/PurchaseOrder.js';
import { successResponse } from '../utils/response.js';
import mongoose from 'mongoose';
import {
  buildTimeBucketExpression,
  resolveOrganizationLocaleContext
} from '../services/i18n/organizationLocaleService.js';

const CLOSED_PO_STATUSES = ['RECEIVED', 'CLOSED', 'received', 'closed'];

const ACTIVE_PO_STATUSES = [
  'SENT',
  'RECEIVED',
  'CLOSED',
  'sent',
  'received',
  'closed'
];

const applyLocaleHeaders = (res, localeContext) => {
  if (!localeContext) return;
  res.setHeader('x-org-timezone', String(localeContext.timezone || 'UTC'));
  res.setHeader('x-org-currency', String(localeContext.currencyCode || 'UGX'));
  res.setHeader('x-org-locale', String(localeContext.locale || 'en-UG'));
  res.setHeader('x-org-country', String(localeContext.countryCode || 'UG'));
};

const sendLocalizedSuccess = (res, data, message, localeContext) => {
  applyLocaleHeaders(res, localeContext);
  return successResponse(res, data, message, 200, {
    localeContext
  });
};

/**
 * 📊 Purchase Order Status Summary (A20.3.1)
 */
export const getPurchaseOrderStatusSummary = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const summary = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      draft: 0,
      sent: 0,
      received: 0,
      closed: 0,
      cancelled: 0
    };

    for (const row of summary) {
      if (!row._id) continue;
      result[String(row._id).toLowerCase()] = row.count;
    }

    return sendLocalizedSuccess(
      res,
      result,
      'Purchase order status summary fetched successfully',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🏭 Supplier Purchase Order Summary (A20.3.2)
 */
export const getSupplierPurchaseOrderSummary = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const summary = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalSpend: { $sum: '$totalAmount' },
          draft: {
            $sum: {
              $cond: [{ $in: ['$status', ['DRAFT', 'draft']] }, 1, 0]
            }
          },
          sent: {
            $sum: {
              $cond: [{ $in: ['$status', ['SENT', 'sent']] }, 1, 0]
            }
          },
          received: {
            $sum: {
              $cond: [{ $in: ['$status', ['RECEIVED', 'received']] }, 1, 0]
            }
          },
          closed: {
            $sum: {
              $cond: [{ $in: ['$status', ['CLOSED', 'closed']] }, 1, 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $in: ['$status', ['CANCELLED', 'cancelled']] }, 1, 0]
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
          totalOrders: 1,
          totalQuantity: 1,
          totalSpend: 1,
          statusBreakdown: {
            draft: '$draft',
            sent: '$sent',
            received: '$received',
            closed: '$closed',
            cancelled: '$cancelled'
          }
        }
      },
      { $sort: { totalSpend: -1 } }
    ]);

    return sendLocalizedSuccess(
      res,
      summary,
      'Supplier purchase order summary fetched successfully',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 📈 Purchase Order Trend (A20.3.3)
 * Query: ?period=day | month
 */
export const getPurchaseOrderTrend = async (req, res, next) => {
  try {
    const period = req.query.period === 'day' ? 'day' : 'month';
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });
    const timeBucketExpr = buildTimeBucketExpression({
      dateField: 'createdAt',
      period,
      timezone: localeContext.timezone
    });

    const trend = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId
        }
      },
      {
        $group: {
          _id: timeBucketExpr,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' },
          totalSpend: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formatted = trend.map((row) => ({
      period: String(row._id || ''),
      totalOrders: row.totalOrders,
      totalQuantity: row.totalQuantity,
      totalSpend: row.totalSpend
    }));

    return sendLocalizedSuccess(
      res,
      formatted,
      'Purchase order trend fetched successfully',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};
/**
 * 💰 Purchase Order Value Summary (A20.5.1)
 */
export const getPurchaseOrderValueSummary = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const summary = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: ACTIVE_PO_STATUSES }
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalAmount: { $sum: '$totalAmount' }
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
          supplier: '$supplier.name',
          totalAmount: 1
        }
      }
    ]);

    const totalSpend = summary.reduce((sum, row) => sum + row.totalAmount, 0);

    return sendLocalizedSuccess(
      res,
      { totalSpend, bySupplier: summary },
      'Purchase order value summary fetched successfully',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

export const getSupplierPerformanceReport = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const report = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: CLOSED_PO_STATUSES },
          sentAt: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      {
        $addFields: {
          leadTimeDays: {
            $cond: [
              { $and: ['$receivedAt', '$sentAt'] },
              {
                $divide: [
                  { $subtract: ['$receivedAt', '$sentAt'] },
                  1000 * 60 * 60 * 24
                ]
              },
              null
            ]
          },
          isOnTime: {
            $cond: [
              {
                $and: [
                  '$receivedAt',
                  '$expectedDeliveryDate',
                  { $lte: ['$receivedAt', '$expectedDeliveryDate'] }
                ]
              },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: '$supplier._id',
          supplierName: { $first: '$supplier.name' },
          totalOrders: { $sum: 1 },
          receivedOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['RECEIVED', 'received']] }, 1, 0]
            }
          },
          onTimeDeliveries: { $sum: '$isOnTime' },
          avgLeadTimeDays: { $avg: '$leadTimeDays' }
        }
      },
      {
        $addFields: {
          reliabilityScore: {
            $multiply: [{ $divide: ['$receivedOrders', '$totalOrders'] }, 100]
          },
          onTimeRate: {
            $multiply: [
              { $divide: ['$onTimeDeliveries', '$receivedOrders'] },
              100
            ]
          }
        }
      },
      { $sort: { reliabilityScore: -1 } }
    ]);

    return sendLocalizedSuccess(
      res,
      report,
      'Supplier performance report generated',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

export const getTotalSpendSummary = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const summary = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: CLOSED_PO_STATUSES }
        }
      },
      { $unwind: '$items' },
      {
        $project: {
          lineTotal: {
            $multiply: ['$items.quantity', '$items.unitCost']
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$lineTotal' }
        }
      }
    ]);

    return sendLocalizedSuccess(
      res,
      { totalSpend: summary[0]?.totalSpend || 0 },
      'Total spend calculated',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

export const getSpendBySupplier = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const report = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: CLOSED_PO_STATUSES }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: '$supplier' },
      {
        $group: {
          _id: '$supplier._id',
          supplierName: { $first: '$supplier.name' },
          totalSpend: {
            $sum: {
              $multiply: ['$items.quantity', '$items.unitCost']
            }
          }
        }
      },
      { $sort: { totalSpend: -1 } }
    ]);

    return sendLocalizedSuccess(
      res,
      report,
      'Spend by supplier calculated',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

export const getSpendByProduct = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });

    const report = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: CLOSED_PO_STATUSES }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product._id',
          productName: { $first: '$product.name' },
          sku: { $first: '$product.sku' },
          totalSpend: {
            $sum: {
              $multiply: ['$items.quantity', '$items.unitCost']
            }
          }
        }
      },
      { $sort: { totalSpend: -1 } }
    ]);

    return sendLocalizedSuccess(
      res,
      report,
      'Spend by product calculated',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};

export const getMonthlySpendTrend = async (req, res, next) => {
  try {
    const organizationId = new mongoose.Types.ObjectId(req.organizationId);
    const localeContext = await resolveOrganizationLocaleContext({
      organizationId: req.organizationId
    });
    const periodExpr = buildTimeBucketExpression({
      dateField: 'receivedAt',
      period: 'month',
      timezone: localeContext.timezone
    });

    const trend = await PurchaseOrder.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $in: CLOSED_PO_STATUSES },
          receivedAt: { $exists: true }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: periodExpr,
          totalSpend: {
            $sum: {
              $multiply: ['$items.quantity', '$items.unitCost']
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return sendLocalizedSuccess(
      res,
      trend,
      'Monthly spend trend calculated',
      localeContext
    );
  } catch (err) {
    next(err);
  }
};
