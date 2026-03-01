import express from 'express';
import {
  getProductInventoryTrend,
  getDailyInventorySummary,
  getInventoryDrops,
  getReorderIntelligence,
  getActiveReorderAlerts,
  getResolvedReorderAlerts,
  getReorderAlertKPIs,
  getActiveAlertsBySku,
  getReorderAlertTrend,
  createManualReorderAlert,
  resolveReorderAlert,
  runAutomaticReorderAlerts,
  createInventoryStocktakeSession,
  listInventoryStocktakeSessions,
  getInventoryStocktakeSession,
  submitInventoryStocktakeCounts,
  approveInventoryStocktakeSession
} from '../controllers/inventoryController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requirePermission from '../middlewares/requirePermission.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import validateRequest from '../middlewares/validateRequest.js';
import { PERMISSIONS } from '../authorization/permissions.js';

import {
  createManualReorderAlertValidator,
  createStocktakeSessionValidator,
  inventoryProductParamValidator,
  reorderIntelligenceQueryValidator,
  resolveReorderAlertParamValidator,
  stocktakeSessionIdParamValidator,
  submitStocktakeCountsValidator,
  stocktakeListQueryValidator
} from '../validations/inventoryValidators.js';

import {
  manualReorderAlertLimiter,
  resolveReorderAlertLimiter,
  runReorderEngineLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();
router.use(protect, requireOrganization);

/* ======================================================
   INVENTORY INSIGHTS
====================================================== */

/**
 * 📈 Product inventory trend
 */
router.get(
  '/product/:productId/trend',
  requirePermission(PERMISSIONS.INVENTORY_VIEW),
  inventoryProductParamValidator,
  validateRequest,
  getProductInventoryTrend
);

/**
 * 📊 Daily inventory summary
 */
router.get(
  '/summary/daily',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  getDailyInventorySummary
);

/**
 * 🚨 Inventory drops (shrinkage detection)
 */
router.get(
  '/alerts/drops',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  getInventoryDrops
);

/* ======================================================
   REORDER ALERTS
====================================================== */

/**
 * 🚨 ACTIVE reorder alerts
 */
router.get(
  '/alerts/reorder/active',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  getActiveReorderAlerts
);

/**
 * ✅ RESOLVED reorder alerts
 */
router.get(
  '/alerts/reorder/resolved',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  getResolvedReorderAlerts
);

/**
 * 📊 Reorder alert KPIs
 */
router.get(
  '/alerts/reorder/kpis',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  getReorderAlertKPIs
);

/**
 * 📦 Active reorder alerts grouped by SKU
 */
router.get(
  '/alerts/reorder/by-sku',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  getActiveAlertsBySku
);

/**
 * 📈 Reorder alert trend
 */
router.get(
  '/alerts/reorder/trend',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  getReorderAlertTrend
);

/**
 * ➕ MANUAL reorder alert
 * (RATE LIMITED + AUDITED)
 */
router.post(
  '/alerts/reorder/manual',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  manualReorderAlertLimiter,
  createManualReorderAlertValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_MANUAL_REORDER_ALERT',
    resource: 'REORDER_ALERT'
  }),
  createManualReorderAlert
);

/**
 * ✅ Resolve reorder alert
 * (RATE LIMITED + AUDITED)
 */
router.patch(
  '/alerts/reorder/:alertId/resolve',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  resolveReorderAlertLimiter,
  resolveReorderAlertParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'RESOLVE_REORDER_ALERT',
    resource: 'REORDER_ALERT'
  }),
  resolveReorderAlert
);

/* ======================================================
   REORDER ENGINE
====================================================== */

/**
 * 🔁 Reorder point intelligence
 */
router.get(
  '/reorder-intelligence',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  reorderIntelligenceQueryValidator,
  validateRequest,
  getReorderIntelligence
);

/**
 * 🤖 Run automatic reorder alert engine
 * (RATE LIMITED + AUDITED – SYSTEM)
 */
router.post(
  '/alerts/reorder/run',
  requirePermission(PERMISSIONS.REORDER_MANAGE),
  runReorderEngineLimiter,
  auditMiddleware({
    action: 'RUN_AUTOMATIC_REORDER_ENGINE',
    resource: 'SYSTEM'
  }),
  runAutomaticReorderAlerts
);

/* ======================================================
   STOCKTAKE / CYCLE COUNT
====================================================== */

router.post(
  '/stocktakes',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  createStocktakeSessionValidator,
  validateRequest,
  auditMiddleware({
    action: 'CREATE_STOCKTAKE_SESSION',
    resource: 'INVENTORY'
  }),
  createInventoryStocktakeSession
);

router.get(
  '/stocktakes',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  stocktakeListQueryValidator,
  validateRequest,
  listInventoryStocktakeSessions
);

router.get(
  '/stocktakes/:sessionId',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  stocktakeSessionIdParamValidator,
  validateRequest,
  getInventoryStocktakeSession
);

router.patch(
  '/stocktakes/:sessionId/counts',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  submitStocktakeCountsValidator,
  validateRequest,
  auditMiddleware({
    action: 'SUBMIT_STOCKTAKE_COUNTS',
    resource: 'INVENTORY'
  }),
  submitInventoryStocktakeCounts
);

router.post(
  '/stocktakes/:sessionId/approve',
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  stocktakeSessionIdParamValidator,
  validateRequest,
  auditMiddleware({
    action: 'APPROVE_STOCKTAKE_SESSION',
    resource: 'INVENTORY'
  }),
  approveInventoryStocktakeSession
);

export default router;
