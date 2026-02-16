import express from 'express';
import {
  getCogsEntries,
  getDeadStock,
  getGrossMargin,
  getInventoryValuation,
  getRealtimeStats,
  getValuationConfig,
  patchValuationMethod
} from '../controllers/financeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import validateRequest from '../middlewares/validateRequest.js';
import {
  cogsQueryValidator,
  deadStockQueryValidator,
  financeValuationQueryValidator,
  grossMarginQueryValidator,
  patchValuationMethodValidator
} from '../validations/financeValidators.js';

const router = express.Router();

router.use(protect, requireOrganization, requireRoles('admin', 'manager'));

router.get(
  '/valuation',
  financeValuationQueryValidator,
  validateRequest,
  getInventoryValuation
);
router.get('/valuation-method', getValuationConfig);
router.patch(
  '/valuation-method',
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
router.get('/realtime-stats', getRealtimeStats);

export default router;
