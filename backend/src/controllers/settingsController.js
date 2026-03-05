import Organization from '../models/Organization.js';
import OrganizationSettings from '../models/OrganizationSettings.js';
import { AppError } from '../errors/AppError.js';
import { successResponse } from '../utils/response.js';
import { logAudit } from '../utils/auditLogger.js';
import { setDefaultValuationMethod } from '../services/finance/valuationService.js';
import { updateTaxConfiguration } from '../services/finance/taxService.js';
import {
  fetchLiveExchangeRate,
  upsertExchangeRates
} from '../services/finance/currencyService.js';
import { logger } from '../observability/logger.js';

const mergeNestedObject = (target = {}, patch = {}) => {
  const next = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      next[key] = mergeNestedObject(target[key], value);
      continue;
    }
    next[key] = value;
  }
  return next;
};

const getOrCreateOrganizationSettings = async (organizationId) => {
  let settings = await OrganizationSettings.findOne({
    organization: organizationId
  });

  if (!settings) {
    settings = await OrganizationSettings.create({
      organization: organizationId
    });
  }

  return settings;
};

const buildSettingsResponse = ({ organization, settings }) => ({
  organizationName: organization?.name || null,
  organizationCode: organization?.code || null,
  companyProfile: settings.companyProfile || {},
  notifications: {
    ...(settings.notifications || {}),
    lowStockSmsEnabled: Boolean(organization?.smsLowStockEnabled),
    lowStockRecipients: Array.isArray(organization?.smsLowStockRecipients)
      ? organization.smsLowStockRecipients
      : []
  },
  inventory: settings.inventory || {},
  finance: settings.finance || {},
  userAccess: settings.userAccess || {},
  securitySession: settings.securitySession || {},
  realtimeOffline: settings.realtimeOffline || {},
  auditBackup: settings.auditBackup || {},
  updatedAt: settings.updatedAt || null
});

const applySettingsPatch = (settings, patchPayload = {}) => {
  const sections = [
    'companyProfile',
    'notifications',
    'inventory',
    'finance',
    'userAccess',
    'securitySession',
    'realtimeOffline',
    'auditBackup'
  ];

  for (const section of sections) {
    if (patchPayload[section] === undefined) {
      continue;
    }

    if (
      patchPayload[section] &&
      typeof patchPayload[section] === 'object' &&
      !Array.isArray(patchPayload[section])
    ) {
      settings[section] = mergeNestedObject(
        settings[section] || {},
        patchPayload[section]
      );
      continue;
    }

    settings[section] = patchPayload[section];
  }

  if (Object.prototype.hasOwnProperty.call(patchPayload, 'organizationName')) {
    settings.markModified('companyProfile');
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const [organization, settings] = await Promise.all([
      Organization.findById(req.organizationId)
        .select('name code smsLowStockEnabled smsLowStockRecipients')
        .lean(),
      getOrCreateOrganizationSettings(req.organizationId)
    ]);

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    return successResponse(
      res,
      buildSettingsResponse({ organization, settings }),
      'Settings retrieved'
    );
  } catch (error) {
    return next(error);
  }
};

export const patchSettings = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    const settings = await getOrCreateOrganizationSettings(req.organizationId);

    applySettingsPatch(settings, req.body || {});
    settings.updatedBy = req.user?._id || null;

    const isDisplayCurrencyFieldPresent = Object.prototype.hasOwnProperty.call(
      req.body?.finance || {},
      'displayCurrencyCode'
    );
    const isBaseCurrencyFieldPresent = Object.prototype.hasOwnProperty.call(
      req.body?.companyProfile || {},
      'currencyCode'
    );

    const nextBaseCurrencyCode = String(
      settings.companyProfile?.currencyCode || 'UGX'
    )
      .trim()
      .toUpperCase();
    const nextDisplayCurrencyCode = String(
      settings.finance?.displayCurrencyCode || nextBaseCurrencyCode
    )
      .trim()
      .toUpperCase();

    const shouldSyncDisplayCurrencyRate =
      (isDisplayCurrencyFieldPresent || isBaseCurrencyFieldPresent) &&
      nextDisplayCurrencyCode.length === 3 &&
      nextBaseCurrencyCode.length === 3 &&
      nextDisplayCurrencyCode !== nextBaseCurrencyCode;

    let liveDisplayCurrencyRate = null;
    if (shouldSyncDisplayCurrencyRate) {
      liveDisplayCurrencyRate = await fetchLiveExchangeRate({
        baseCurrencyCode: nextBaseCurrencyCode,
        quoteCurrencyCode: nextDisplayCurrencyCode
      });
    }

    if (req.body?.organizationName !== undefined) {
      organization.name = String(req.body.organizationName || '').trim();
    }

    if (req.body?.organizationCode !== undefined) {
      organization.code = String(req.body.organizationCode || '')
        .trim()
        .toUpperCase();
    }

    if (req.body?.notifications?.lowStockSmsEnabled !== undefined) {
      organization.smsLowStockEnabled = Boolean(
        req.body.notifications.lowStockSmsEnabled
      );
    }

    if (req.body?.notifications?.lowStockRecipients !== undefined) {
      organization.smsLowStockRecipients = Array.isArray(
        req.body.notifications.lowStockRecipients
      )
        ? req.body.notifications.lowStockRecipients
        : [];
    }

    await settings.save();
    await organization.save();

    if (liveDisplayCurrencyRate) {
      try {
        await upsertExchangeRates({
          organizationId: req.organizationId,
          baseCurrencyCode: liveDisplayCurrencyRate.baseCurrencyCode,
          rates: [
            {
              quoteCurrencyCode: liveDisplayCurrencyRate.quoteCurrencyCode,
              rate: liveDisplayCurrencyRate.rate,
              source: 'SYSTEM'
            }
          ],
          updatedBy: req.user?._id || null
        });
      } catch (error) {
        logger.warn('settings_fx_auto_sync_failed', {
          organizationId: req.organizationId,
          baseCurrencyCode: liveDisplayCurrencyRate.baseCurrencyCode,
          quoteCurrencyCode: liveDisplayCurrencyRate.quoteCurrencyCode,
          error: String(error?.message || error)
        });
      }
    }

    if (req.body?.finance?.valuationMethod) {
      await setDefaultValuationMethod({
        organizationId: req.organizationId,
        defaultMethod: settings.finance.valuationMethod
      });
    }

    if (
      req.body?.finance?.taxInclusivePricing !== undefined ||
      req.body?.companyProfile?.currencyCode !== undefined ||
      req.body?.companyProfile?.vatRateDefault !== undefined
    ) {
      await updateTaxConfiguration({
        organizationId: req.organizationId,
        taxInclusivePricing: settings.finance.taxInclusivePricing,
        currencyCode: settings.companyProfile.currencyCode,
        vatRate: settings.companyProfile.vatRateDefault,
        updatedBy: req.user?._id || null
      });
    }

    await logAudit({
      req,
      action: 'UPDATE_SETTINGS',
      resource: 'SETTINGS',
      resourceId: settings._id,
      organizationId: req.organizationId,
      meta: {
        updatedSections: Object.keys(req.body || {})
      }
    });

    return successResponse(
      res,
      buildSettingsResponse({
        organization,
        settings
      }),
      'Settings updated'
    );
  } catch (error) {
    return next(error);
  }
};

export default {
  getSettings,
  patchSettings
};
