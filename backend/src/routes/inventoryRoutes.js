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
  runAutomaticReorderAlerts
} from '../controllers/inventoryController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import validateRequest from '../middlewares/validateRequest.js';

import {
  createManualReorderAlertValidator,
  inventoryProductParamValidator,
  reorderIntelligenceQueryValidator,
  resolveReorderAlertParamValidator
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
  protect,
  requireRoles('admin', 'staff'),
  inventoryProductParamValidator,
  validateRequest,
  getProductInventoryTrend
);

/**
 * 📊 Daily inventory summary
 */
router.get(
  '/summary/daily',
  protect,
  requireRoles('admin'),
  getDailyInventorySummary
);

/**
 * 🚨 Inventory drops (shrinkage detection)
 */
router.get(
  '/alerts/drops',
  protect,
  requireRoles('admin'),
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
  protect,
  requireRoles('admin'),
  getActiveReorderAlerts
);

/**
 * ✅ RESOLVED reorder alerts
 */
router.get(
  '/alerts/reorder/resolved',
  protect,
  requireRoles('admin'),
  getResolvedReorderAlerts
);

/**
 * 📊 Reorder alert KPIs
 */
router.get(
  '/alerts/reorder/kpis',
  protect,
  requireRoles('admin'),
  getReorderAlertKPIs
);

/**
 * 📦 Active reorder alerts grouped by SKU
 */
router.get(
  '/alerts/reorder/by-sku',
  protect,
  requireRoles('admin'),
  getActiveAlertsBySku
);

/**
 * 📈 Reorder alert trend
 */
router.get(
  '/alerts/reorder/trend',
  protect,
  requireRoles('admin'),
  getReorderAlertTrend
);

/**
 * ➕ MANUAL reorder alert
 * (RATE LIMITED + AUDITED)
 */
router.post(
  '/alerts/reorder/manual',
  protect,
  requireRoles('admin'),
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
  protect,
  requireRoles('admin'),
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
  protect,
  requireRoles('admin'),
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
  protect,
  requireRoles('admin'),
  runReorderEngineLimiter,
  auditMiddleware({
    action: 'RUN_AUTOMATIC_REORDER_ENGINE',
    resource: 'SYSTEM'
  }),
  runAutomaticReorderAlerts
);

export default router;
