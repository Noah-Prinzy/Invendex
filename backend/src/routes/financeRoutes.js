import express from 'express';
import {
  getCurrencyExchangeRates,
  getCogsEntries,
  getDeadStock,
  getGrossMargin,
  getInventoryValuation,
  getNotificationSettings,
  postCurrencyConversion,
  putCurrencyExchangeRates,
  getRealtimeStats,
  getTaxConfiguration,
  getVatSummary,
  getValuationConfig,
  patchNotificationSettings,
  patchTaxConfiguration,
  patchValuationMethod
} from '../controllers/financeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireFeatureFlag from '../middlewares/requireFeatureFlag.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import requirePlanFeature from '../middlewares/requirePlanFeature.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  convertCurrencyValidator,
  cogsQueryValidator,
  deadStockQueryValidator,
  exchangeRatesQueryValidator,
  financeValuationQueryValidator,
  grossMarginQueryValidator,
  patchNotificationSettingsValidator,
  patchTaxConfigurationValidator,
  patchValuationMethodValidator,
  putExchangeRatesValidator,
  vatSummaryQueryValidator
} from '../validations/financeValidators.js';

const router = express.Router();

router.use(
  protect,
  requireOrganization,
  requirePermission(PERMISSIONS.FINANCE_VIEW)
);

router.get(
  '/valuation',
  requireFeatureFlag('finance_valuation'),
  requirePlanFeature('finance_valuation'),
  financeValuationQueryValidator,
  validateRequest,
  getInventoryValuation
);
router.get('/valuation-method', getValuationConfig);
router.patch(
  '/valuation-method',
  requirePermission(PERMISSIONS.FINANCE_MANAGE),
  patchValuationMethodValidator,
  validateRequest,
  patchValuationMethod
);

router.get(
  '/cogs',
  requireFeatureFlag('finance_valuation'),
  requirePlanFeature('finance_valuation'),
  cogsQueryValidator,
  validateRequest,
  getCogsEntries
);
router.get(
  '/gross-margin',
  requireFeatureFlag('finance_valuation'),
  requirePlanFeature('finance_valuation'),
  grossMarginQueryValidator,
  validateRequest,
  getGrossMargin
);
router.get(
  '/dead-stock',
  requireFeatureFlag('finance_valuation'),
  requirePlanFeature('finance_valuation'),
  deadStockQueryValidator,
  validateRequest,
  getDeadStock
);
router.get('/tax-config', getTaxConfiguration);
router.patch(
  '/tax-config',
  requirePermission(PERMISSIONS.FINANCE_MANAGE),
  patchTaxConfigurationValidator,
  validateRequest,
  patchTaxConfiguration
);
router.get(
  '/vat-summary',
  vatSummaryQueryValidator,
  validateRequest,
  getVatSummary
);
router.get('/notification-settings', getNotificationSettings);
router.patch(
  '/notification-settings',
  requirePermission(PERMISSIONS.FINANCE_MANAGE),
  patchNotificationSettingsValidator,
  validateRequest,
  patchNotificationSettings
);
router.get('/realtime-stats', getRealtimeStats);
router.get(
  '/exchange-rates',
  exchangeRatesQueryValidator,
  validateRequest,
  getCurrencyExchangeRates
);
router.put(
  '/exchange-rates',
  requirePermission(PERMISSIONS.FINANCE_MANAGE),
  putExchangeRatesValidator,
  validateRequest,
  putCurrencyExchangeRates
);
router.post(
  '/convert-currency',
  convertCurrencyValidator,
  validateRequest,
  postCurrencyConversion
);

export default router;
