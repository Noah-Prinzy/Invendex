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
import {
  applyConversion,
  buildCurrencyConversionContext,
  convertCurrencyAmount,
  getExchangeRates,
  upsertExchangeRates
} from '../services/finance/currencyService.js';

const withCurrencyMeta = (payload, context) => ({
  ...(payload || {}),
  currencyCode: context.currencyCode,
  baseCurrencyCode: context.baseCurrencyCode,
  exchangeRate: context.rate,
  convertedFromBase: context.converted === true
});

export const getInventoryValuation = async (req, res, next) => {
  try {
    const valuation = await computeInventoryValuation({
      organizationId: req.organizationId,
      warehouseId: req.query.warehouseId || null,
      method: req.query.method || null
    });

    const conversionContext = await buildCurrencyConversionContext({
      organizationId: req.organizationId,
      targetCurrencyCode: req.query.currencyCode || null
    });

    if (conversionContext.converted) {
      valuation.totalInventoryValue = applyConversion(
        valuation.totalInventoryValue,
        conversionContext
      );
      valuation.byProduct = Array.isArray(valuation.byProduct)
        ? valuation.byProduct.map((item) => ({
            ...item,
            unitCost: applyConversion(item.unitCost, conversionContext),
            value: applyConversion(item.value, conversionContext)
          }))
        : [];
    }

    return successResponse(
      res,
      withCurrencyMeta(valuation, conversionContext),
      'Inventory valuation computed'
    );
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

    const conversionContext = await buildCurrencyConversionContext({
      organizationId: req.organizationId,
      targetCurrencyCode: req.query.currencyCode || null
    });

    const mappedRows = conversionContext.converted
      ? rows.map((row) => ({
          ...row,
          totalCogs: applyConversion(row.totalCogs, conversionContext),
          unitCogs: applyConversion(row.unitCogs, conversionContext),
          consumedLayers: Array.isArray(row.consumedLayers)
            ? row.consumedLayers.map((layer) => ({
                ...layer,
                unitCost: applyConversion(layer.unitCost, conversionContext),
                lineCost: applyConversion(layer.lineCost, conversionContext)
              }))
            : [],
          currencyCode: conversionContext.currencyCode,
          baseCurrencyCode: conversionContext.baseCurrencyCode,
          exchangeRate: conversionContext.rate,
          convertedFromBase: true
        }))
      : rows.map((row) => ({
          ...row,
          currencyCode: conversionContext.currencyCode,
          baseCurrencyCode: conversionContext.baseCurrencyCode,
          exchangeRate: conversionContext.rate,
          convertedFromBase: false
        }));

    return successResponse(res, mappedRows, 'COGS entries retrieved');
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

    const conversionContext = await buildCurrencyConversionContext({
      organizationId: req.organizationId,
      targetCurrencyCode: req.query.currencyCode || null
    });

    if (conversionContext.converted) {
      report.totals = {
        ...report.totals,
        revenue: applyConversion(report.totals?.revenue, conversionContext),
        cogs: applyConversion(report.totals?.cogs, conversionContext),
        grossMargin: applyConversion(
          report.totals?.grossMargin,
          conversionContext
        )
      };

      report.items = Array.isArray(report.items)
        ? report.items.map((item) => ({
            ...item,
            revenue: applyConversion(item.revenue, conversionContext),
            cogs: applyConversion(item.cogs, conversionContext),
            grossMargin: applyConversion(item.grossMargin, conversionContext)
          }))
        : [];
    }

    return successResponse(
      res,
      withCurrencyMeta(report, conversionContext),
      'Gross margin report generated'
    );
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

    const conversionContext = await buildCurrencyConversionContext({
      organizationId: req.organizationId,
      targetCurrencyCode: req.query.currencyCode || null
    });

    if (conversionContext.converted) {
      report.totalValue = applyConversion(report.totalValue, conversionContext);
      report.items = Array.isArray(report.items)
        ? report.items.map((item) => ({
            ...item,
            unitPrice: applyConversion(item.unitPrice, conversionContext),
            inventoryValue: applyConversion(
              item.inventoryValue,
              conversionContext
            )
          }))
        : [];
    }

    return successResponse(
      res,
      withCurrencyMeta(report, conversionContext),
      'Dead stock report generated'
    );
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
      taxAuthorityName: req.body.taxAuthorityName,
      taxRegistrationNumber: req.body.taxRegistrationNumber,
      regime: req.body.regime,
      defaultTaxCategory: req.body.defaultTaxCategory,
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

export const getCurrencyExchangeRates = async (req, res, next) => {
  try {
    const payload = await getExchangeRates({
      organizationId: req.organizationId,
      baseCurrencyCode: req.query.baseCurrencyCode || null
    });

    return successResponse(res, payload, 'Exchange rates retrieved');
  } catch (err) {
    return next(err);
  }
};

export const putCurrencyExchangeRates = async (req, res, next) => {
  try {
    const payload = await upsertExchangeRates({
      organizationId: req.organizationId,
      baseCurrencyCode: req.body.baseCurrencyCode || null,
      rates: req.body.rates || [],
      updatedBy: req.user?._id || null
    });

    return successResponse(res, payload, 'Exchange rates updated');
  } catch (err) {
    return next(err);
  }
};

export const postCurrencyConversion = async (req, res, next) => {
  try {
    const payload = await convertCurrencyAmount({
      organizationId: req.organizationId,
      amount: req.body.amount,
      fromCurrencyCode: req.body.fromCurrencyCode,
      toCurrencyCode: req.body.toCurrencyCode
    });

    return successResponse(res, payload, 'Currency conversion computed');
  } catch (err) {
    return next(err);
  }
};
