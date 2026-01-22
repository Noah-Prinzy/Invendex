import express from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  receivePurchaseOrder,
  sendPurchaseOrder,
  closePurchaseOrder,
  generatePurchaseOrdersFromAlerts
} from '../controllers/purchaseOrderController.js';

import { protect } from '../middlewares/authMiddleware.js';
import requireRoles from '../middlewares/requireRoles.js';
import { auditMiddleware } from '../middlewares/auditMiddleware.js';

import {
  createPurchaseOrderLimiter,
  sendPurchaseOrderLimiter,
  receivePurchaseOrderLimiter,
  closePurchaseOrderLimiter,
  generatePurchaseOrdersLimiter
} from '../middlewares/rateLimiter.js';

const router = express.Router();

// 🔐 Admin only
router.use(protect, requireRoles('admin'));

/**
 * ➕ Create purchase order
 * (RATE LIMITED + AUDITED)
 */
router.post(
  '/',
  createPurchaseOrderLimiter,
  auditMiddleware({
    action: 'CREATE_PURCHASE_ORDER',
    resource: 'PURCHASE_ORDER'
  }),
  createPurchaseOrder
);

/**
 * 📄 Get all purchase orders
 */
router.get('/', getPurchaseOrders);

/**
 * 🔍 Get single purchase order
 */
router.get('/:id', getPurchaseOrderById);

/**
 * 📤 Send purchase order
 * (RATE LIMITED + AUDITED)
 */
router.patch(
  '/:id/send',
  sendPurchaseOrderLimiter,
  auditMiddleware({
    action: 'SEND_PURCHASE_ORDER',
    resource: 'PURCHASE_ORDER'
  }),
  sendPurchaseOrder
);

/**
 * 📦 Receive purchase order
 * (RATE LIMITED + AUDITED)
 */
router.patch(
  '/:id/receive',
  receivePurchaseOrderLimiter,
  auditMiddleware({
    action: 'RECEIVE_PURCHASE_ORDER',
    resource: 'PURCHASE_ORDER'
  }),
  receivePurchaseOrder
);

/**
 * 🔒 Close purchase order
 * (RATE LIMITED + AUDITED)
 */
router.patch(
  '/:id/close',
  closePurchaseOrderLimiter,
  auditMiddleware({
    action: 'CLOSE_PURCHASE_ORDER',
    resource: 'PURCHASE_ORDER'
  }),
  closePurchaseOrder
);

/**
 * 🤖 Generate purchase orders from reorder alerts
 * (RATE LIMITED + AUDITED – SYSTEM)
 */
router.post(
  '/generate-from-alerts',
  generatePurchaseOrdersLimiter,
  auditMiddleware({
    action: 'GENERATE_PURCHASE_ORDERS_FROM_ALERTS',
    resource: 'SYSTEM'
  }),
  generatePurchaseOrdersFromAlerts
);

export default router;
