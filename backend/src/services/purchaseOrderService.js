import mongoose from 'mongoose';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ReorderAlert from '../models/ReorderAlert.js';

import { assertPurchaseOrderTransition } from '../utils/assertPurchaseOrderTransition.js';
import { applyPurchaseOrderToInventory } from './inventory/inventoryService.js';
import AppError from '../utils/AppError.js';
import { logger } from '../observability/logger.js';

const isTransactionUnsupported = (err) => {
  const message = String(err?.message || '').toLowerCase();
  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('standalone')
  );
};

const runWithOptionalTransaction = async ({
  operationName,
  operationMeta = {},
  runWithSession
}) => {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await runWithSession(session);
      });
      return result;
    } catch (err) {
      if (!isTransactionUnsupported(err)) {
        logger.error('mongo_transaction_failed', {
          operationName,
          ...operationMeta,
          err
        });
        throw err;
      }

      logger.warn('mongo_transaction_fallback_non_transaction_mode', {
        operationName,
        ...operationMeta
      });
      return runWithSession(null);
    }
  } finally {
    await session.endSession();
  }
};

/**
 * 🤖 Generate Purchase Orders from active reorder alerts
 * Supplier-grouped, atomic, idempotent
 */
export const generatePurchaseOrdersFromAlerts = async ({
  createdByUserId,
  warehouseId,
  organizationId
} = {}) => {
  if (!createdByUserId) {
    throw new AppError(
      'createdByUserId is required to generate purchase orders',
      400
    );
  }

  if (!warehouseId) {
    throw new AppError(
      'warehouse is required to generate purchase orders',
      400
    );
  }

  if (!organizationId) {
    throw new AppError(
      'organizationId is required to generate purchase orders',
      400
    );
  }

  return runWithOptionalTransaction({
    operationName: 'generate_purchase_orders_from_alerts',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      createdByUserId: String(createdByUserId)
    },
    runWithSession: async (session) => {
      const alertsQuery = ReorderAlert.find({
        organization: organizationId,
        status: 'ACTIVE',
        resolved: false,
        isLocked: false,
        supplier: { $ne: null },
        supplierUnitCost: { $ne: null }
      }).populate('product supplier');
      if (session) {
        alertsQuery.session(session);
      }
      const alerts = await alertsQuery;

      if (!alerts.length) return [];

      const groupedBySupplier = alerts.reduce((acc, alert) => {
        const supplierId = alert.supplier._id.toString();
        if (!acc[supplierId]) acc[supplierId] = [];
        acc[supplierId].push(alert);
        return acc;
      }, {});

      const createdPurchaseOrders = [];

      for (const supplierId of Object.keys(groupedBySupplier)) {
        const supplierAlerts = groupedBySupplier[supplierId];

        const items = supplierAlerts.map((alert) => ({
          product: alert.product._id,
          sku: alert.sku,
          quantity: alert.reorderQuantity,
          unitCost: alert.supplierUnitCost,
          totalCost: alert.reorderQuantity * alert.supplierUnitCost,
          reorderAlert: alert._id
        }));

        let purchaseOrder;
        if (session) {
          [purchaseOrder] = await PurchaseOrder.create(
            [
              {
                organization: organizationId,
                supplier: supplierId,
                warehouse: warehouseId,
                items,
                status: 'DRAFT',
                source: 'REORDER_ENGINE',
                reorderAlerts: supplierAlerts.map((a) => a._id),
                createdBy: createdByUserId
              }
            ],
            { session }
          );
        } else {
          purchaseOrder = await PurchaseOrder.create({
            organization: organizationId,
            supplier: supplierId,
            warehouse: warehouseId,
            items,
            status: 'DRAFT',
            source: 'REORDER_ENGINE',
            reorderAlerts: supplierAlerts.map((a) => a._id),
            createdBy: createdByUserId
          });
        }

        await ReorderAlert.updateMany(
          {
            _id: { $in: supplierAlerts.map((a) => a._id) },
            organization: organizationId
          },
          {
            $set: {
              purchaseOrder: purchaseOrder._id,
              usedInPurchaseOrder: true,
              usedInPurchaseOrderAt: new Date(),
              isLocked: true,
              status: 'RESOLVED',
              resolved: true,
              resolvedAt: new Date(),
              resolutionReason: 'AUTO_PURCHASE_ORDER'
            }
          },
          session ? { session } : undefined
        );

        createdPurchaseOrders.push(purchaseOrder);
      }

      return createdPurchaseOrders;
    }
  });
};

/**
 * 📤 Send Purchase Order
 */
export const sendPurchaseOrder = async ({
  purchaseOrderId,
  userId,
  organizationId
}) => {
  const purchaseOrder = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    organization: organizationId
  });
  if (!purchaseOrder) {
    throw new AppError('Purchase order not found', 404);
  }

  assertPurchaseOrderTransition({
    currentStatus: purchaseOrder.status,
    nextStatus: 'SENT'
  });

  purchaseOrder.status = 'SENT';
  purchaseOrder.sentAt = new Date();
  purchaseOrder.sentBy = userId;

  await purchaseOrder.save();
  return purchaseOrder;
};

/**
 * 📥 Receive Purchase Order
 * Inventory-safe & idempotent
 */
export const receivePurchaseOrder = async ({
  purchaseOrderId,
  userId,
  organizationId
}) => {
  return runWithOptionalTransaction({
    operationName: 'receive_purchase_order',
    operationMeta: {
      organizationId: String(organizationId),
      purchaseOrderId: String(purchaseOrderId),
      userId: String(userId || '')
    },
    runWithSession: async (session) => {
      const purchaseOrderQuery = PurchaseOrder.findOne({
        _id: purchaseOrderId,
        organization: organizationId
      });
      if (session) {
        purchaseOrderQuery.session(session);
      }
      const purchaseOrder = await purchaseOrderQuery;

      if (!purchaseOrder) {
        throw new AppError('Purchase order not found', 404);
      }

      assertPurchaseOrderTransition({
        currentStatus: purchaseOrder.status,
        nextStatus: 'RECEIVED'
      });

      await applyPurchaseOrderToInventory({
        purchaseOrder,
        actorUserId: userId,
        session
      });

      purchaseOrder.status = 'RECEIVED';
      purchaseOrder.receivedAt = new Date();
      purchaseOrder.receivedBy = userId;

      await purchaseOrder.save(session ? { session } : undefined);
      return purchaseOrder;
    }
  });
};

/**
 * 🔒 Close Purchase Order
 */
export const closePurchaseOrder = async ({
  purchaseOrderId,
  organizationId
}) => {
  const purchaseOrder = await PurchaseOrder.findOne({
    _id: purchaseOrderId,
    organization: organizationId
  });
  if (!purchaseOrder) {
    throw new AppError('Purchase order not found', 404);
  }

  assertPurchaseOrderTransition({
    currentStatus: purchaseOrder.status,
    nextStatus: 'CLOSED'
  });

  purchaseOrder.status = 'CLOSED';
  purchaseOrder.closedAt = new Date();

  await purchaseOrder.save();
  return purchaseOrder;
};
