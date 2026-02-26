import express from 'express';
import {
  getCogsEntries,
  getDeadStock,
  getGrossMargin,
  getInventoryValuation,
  getNotificationSettings,
  getRealtimeStats,
  getTaxConfiguration,
  getVatSummary,
  getValuationConfig,
  patchNotificationSettings,
  patchTaxConfiguration,
  patchValuationMethod
} from '../controllers/financeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requirePermission from '../middlewares/requirePermission.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';
import {
  cogsQueryValidator,
  deadStockQueryValidator,
  financeValuationQueryValidator,
  grossMarginQueryValidator,
  patchNotificationSettingsValidator,
  patchTaxConfigurationValidator,
  patchValuationMethodValidator,
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

router.get('/cogs', cogsQueryValidator, validateRequest, getCogsEntries);
router.get(
  '/gross-margin',
  grossMarginQueryValidator,
  validateRequest,
  getGrossMargin
);
router.get(
  '/dead-stock',
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

export default router;
