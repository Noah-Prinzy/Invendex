import CogsEntry from '../models/CogsEntry.js';
import { successResponse } from '../utils/response.js';
import {
  computeInventoryValuation,
  getOrCreateValuationConfig,
  setDefaultValuationMethod
} from '../services/finance/valuationService.js';
import { getGrossMarginReport } from '../services/finance/marginService.js';
import { getDeadStockItems } from '../services/finance/deadStockService.js';
import {
  getRealtimeEmitStats,
  publishValuationUpdated
} from '../realtime/publisher.js';

export const getInventoryValuation = async (req, res, next) => {
  try {
    const valuation = await computeInventoryValuation({
      organizationId: req.organizationId,
      warehouseId: req.query.warehouseId || null,
      method: req.query.method || null
    });

    return successResponse(res, valuation, 'Inventory valuation computed');
  } catch (err) {
    next(err);
  }
};

export const patchValuationMethod = async (req, res, next) => {
  try {
    const config = await setDefaultValuationMethod({
      organizationId: req.organizationId,
      defaultMethod: req.body.defaultMethod,
      allowMethodOverride: req.body.allowMethodOverride
    });

    publishValuationUpdated({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      data: {
        valuationConfigId: config._id,
        defaultMethod: config.defaultMethod,
        allowMethodOverride: config.allowMethodOverride
      }
    });

    return successResponse(
      res,
      config,
      'Inventory valuation configuration updated'
    );
  } catch (err) {
    next(err);
  }
};

export const getCogsEntries = async (req, res, next) => {
  try {
    const query = {
      organization: req.organizationId
    };

    if (req.query.productId) {
      query.product = req.query.productId;
    }
    if (req.query.warehouseId) {
      query.warehouse = req.query.warehouseId;
    }
    if (req.query.from || req.query.to) {
      query.recordedAt = {};
      if (req.query.from) query.recordedAt.$gte = new Date(req.query.from);
      if (req.query.to) query.recordedAt.$lte = new Date(req.query.to);
    }

    const rows = await CogsEntry.find(query)
      .sort({ recordedAt: -1 })
      .populate('product', 'name sku category')
      .populate('warehouse', 'name code')
      .populate('orderId', 'type status createdAt')
      .lean();

    return successResponse(res, rows, 'COGS entries retrieved');
  } catch (err) {
    next(err);
  }
};

export const getGrossMargin = async (req, res, next) => {
  try {
    const report = await getGrossMarginReport({
      organizationId: req.organizationId,
      from: req.query.from || null,
      to: req.query.to || null,
      groupBy: req.query.groupBy || 'day'
    });

    return successResponse(res, report, 'Gross margin report generated');
  } catch (err) {
    next(err);
  }
};

export const getDeadStock = async (req, res, next) => {
  try {
    const report = await getDeadStockItems({
      organizationId: req.organizationId,
      days: req.query.days || 90,
      warehouseId: req.query.warehouseId || null
    });

    return successResponse(res, report, 'Dead stock report generated');
  } catch (err) {
    next(err);
  }
};

export const getValuationConfig = async (req, res, next) => {
  try {
    const config = await getOrCreateValuationConfig(req.organizationId);
    return successResponse(res, config, 'Valuation configuration retrieved');
  } catch (err) {
    next(err);
  }
};

export const getRealtimeStats = async (req, res, next) => {
  try {
    const stats = getRealtimeEmitStats();
    return successResponse(res, stats, 'Realtime emit stats retrieved');
  } catch (err) {
    next(err);
  }
};
