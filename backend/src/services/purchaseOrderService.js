import PurchaseOrder from '../models/PurchaseOrder.js';
import ReorderAlert from '../models/ReorderAlert.js';

import { assertPurchaseOrderTransition } from '../utils/assertPurchaseOrderTransition.js';
import { applyPurchaseOrderToInventory } from './inventory/inventoryService.js';
import AppError from '../utils/AppError.js';
import { runWithMongoTransactionFallback } from '../utils/runWithMongoTransactionFallback.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  publishInventoryUpdated,
  publishValuationUpdated
} from '../realtime/publisher.js';

/**
 * 🤖 Generate Purchase Orders from active reorder alerts
 * Supplier-grouped, atomic, idempotent
 */
export const generatePurchaseOrdersFromAlerts = async ({
  createdByUserId,
  warehouseId,
  organizationId,
  autoSend = false
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

  return runWithMongoTransactionFallback({
    operationName: 'generate_purchase_orders_from_alerts',
    operationMeta: {
      organizationId: String(organizationId),
      warehouseId: String(warehouseId),
      createdByUserId: String(createdByUserId),
      autoSend: autoSend === true
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
                status: autoSend === true ? 'SENT' : 'DRAFT',
                source: 'REORDER_ENGINE',
                reorderAlerts: supplierAlerts.map((a) => a._id),
                createdBy: createdByUserId,
                sentAt: autoSend === true ? new Date() : null,
                sentBy: autoSend === true ? createdByUserId : null
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
            status: autoSend === true ? 'SENT' : 'DRAFT',
            source: 'REORDER_ENGINE',
            reorderAlerts: supplierAlerts.map((a) => a._id),
            createdBy: createdByUserId,
            sentAt: autoSend === true ? new Date() : null,
            sentBy: autoSend === true ? createdByUserId : null
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

        await logAudit({
          action: 'GENERATE_PURCHASE_ORDER_FROM_ALERTS',
          entity: 'PURCHASE_ORDER',
          entityId: purchaseOrder._id,
          organizationId,
          source: 'system',
          success: true,
          meta: {
            supplierId: String(supplierId),
            warehouseId: String(warehouseId),
            itemCount: items.length,
            createdBy: String(createdByUserId),
            autoSend: autoSend === true
          },
          session,
          silent: true
        });
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
  const result = await runWithMongoTransactionFallback({
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

      const inventoryResult = await applyPurchaseOrderToInventory({
        purchaseOrder,
        actorUserId: userId,
        session,
        deferRealtimePublish: true
      });

      purchaseOrder.status = 'RECEIVED';
      purchaseOrder.receivedAt = new Date();
      purchaseOrder.receivedBy = userId;

      await purchaseOrder.save(session ? { session } : undefined);

      await logAudit({
        action: 'RECEIVE_PURCHASE_ORDER',
        entity: 'PURCHASE_ORDER',
        entityId: purchaseOrder._id,
        organizationId,
        source: 'system',
        success: true,
        meta: {
          status: purchaseOrder.status,
          receivedBy: userId ? String(userId) : null,
          warehouseId: String(purchaseOrder.warehouse || '')
        },
        session,
        silent: true
      });
      return {
        purchaseOrder,
        inventoryRealtimeEvents: inventoryResult?.inventoryRealtimeEvents || [],
        valuationRealtimeEvent: inventoryResult?.valuationRealtimeEvent || null
      };
    }
  });

  for (const realtimePayload of result.inventoryRealtimeEvents || []) {
    publishInventoryUpdated(realtimePayload);
  }

  if (result.valuationRealtimeEvent) {
    publishValuationUpdated(result.valuationRealtimeEvent);
  }

  return result.purchaseOrder;
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
