import CogsEntry from '../models/CogsEntry.js';
import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
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
import {
  getOrCreateTaxConfiguration,
  getVatComplianceSummary,
  updateTaxConfiguration
} from '../services/finance/taxService.js';

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
    let deadStockDays = req.query.days || null;

    if (!deadStockDays) {
      const organizationSettings = await OrganizationSettings.findOne({
        organization: req.organizationId
      })
        .select('inventory.deadStockThresholdDays')
        .lean();

      deadStockDays =
        organizationSettings?.inventory?.deadStockThresholdDays || 90;
    }

    const report = await getDeadStockItems({
      organizationId: req.organizationId,
      days: deadStockDays,
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

export const getTaxConfiguration = async (req, res, next) => {
  try {
    const config = await getOrCreateTaxConfiguration(req.organizationId);
    return successResponse(res, config, 'Tax configuration retrieved');
  } catch (err) {
    next(err);
  }
};

export const patchTaxConfiguration = async (req, res, next) => {
  try {
    const config = await updateTaxConfiguration({
      organizationId: req.organizationId,
      vatEnabled: req.body.vatEnabled,
      vatRate: req.body.vatRate,
      taxInclusivePricing: req.body.taxInclusivePricing,
      countryCode: req.body.countryCode,
      currencyCode: req.body.currencyCode,
      updatedBy: req.user?._id || null
    });

    return successResponse(res, config, 'Tax configuration updated');
  } catch (err) {
    next(err);
  }
};

export const getVatSummary = async (req, res, next) => {
  try {
    const report = await getVatComplianceSummary({
      organizationId: req.organizationId,
      from: req.query.from || null,
      to: req.query.to || null
    });
    return successResponse(res, report, 'VAT compliance summary generated');
  } catch (err) {
    next(err);
  }
};

export const getNotificationSettings = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId)
      .select('smsLowStockEnabled smsLowStockRecipients')
      .lean();

    return successResponse(
      res,
      {
        smsLowStockEnabled: Boolean(organization?.smsLowStockEnabled),
        smsLowStockRecipients: Array.isArray(
          organization?.smsLowStockRecipients
        )
          ? organization.smsLowStockRecipients
          : []
      },
      'Notification settings retrieved'
    );
  } catch (err) {
    next(err);
  }
};

export const patchNotificationSettings = async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.smsLowStockEnabled === 'boolean') {
      update.smsLowStockEnabled = req.body.smsLowStockEnabled;
    }
    if (Array.isArray(req.body.smsLowStockRecipients)) {
      update.smsLowStockRecipients = req.body.smsLowStockRecipients;
    }

    const organization = await Organization.findByIdAndUpdate(
      req.organizationId,
      {
        $set: update
      },
      {
        new: true
      }
    )
      .select('smsLowStockEnabled smsLowStockRecipients')
      .lean();

    return successResponse(res, organization, 'Notification settings updated');
  } catch (err) {
    next(err);
  }
};
