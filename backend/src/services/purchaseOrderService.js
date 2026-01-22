import PurchaseOrder from '../models/PurchaseOrder.js';
import ReorderAlert from '../models/ReorderAlert.js';
import Product from '../models/Product.js';

import { assertPurchaseOrderTransition } from '../utils/assertPurchaseOrderTransition.js';
import { applyPurchaseOrderToInventory } from './inventory/inventoryService.js';
import AppError from '../utils/AppError.js'; // ✅ default import
import inventoryService from './inventory/inventoryService.js';

/**
 * 🤖 Generate Purchase Orders from active reorder alerts
 * Safe, idempotent, supplier-grouped
 */
export const generatePurchaseOrdersFromAlerts = async () => {
  const alerts = await ReorderAlert.find({
    resolved: false,
    linkedPurchaseOrder: { $exists: false },
    supplier: { $ne: null },
    supplierUnitCost: { $ne: null }
  }).populate('product supplier');

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
    if (!supplierAlerts.length) continue;

    const items = supplierAlerts.map(alert => {
      const quantity = Math.max(
        alert.reorderLevel - alert.stock,
        1
      );

      const totalCost = quantity * alert.supplierUnitCost;

      return {
        product: alert.product._id,
        sku: alert.sku,
        quantity,
        unitCost: alert.supplierUnitCost,
        totalCost
      };
    });

    const totalCost = items.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );

    const purchaseOrder = await PurchaseOrder.create({
      supplier: supplierId,
      items,
      totalCost,
      status: 'DRAFT',
      generatedBy: 'SYSTEM'
    });

    await ReorderAlert.updateMany(
      { _id: { $in: supplierAlerts.map(a => a._id) } },
      {
        $set: {
          linkedPurchaseOrder: purchaseOrder._id
        }
      }
    );

    createdPurchaseOrders.push(purchaseOrder);
  }

  return createdPurchaseOrders;
};

/**
 * 📤 Send Purchase Order to supplier
 */
export const sendPurchaseOrder = async (purchaseOrderId) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new AppError('Purchase order not found', 404);
  }

  assertPurchaseOrderTransition({
    currentStatus: purchaseOrder.status,
    nextStatus: 'SENT'
  });

  purchaseOrder.status = 'SENT';
  purchaseOrder.sentAt = new Date();

  await purchaseOrder.save();

  return purchaseOrder;
};

/**
 * 📥 Receive Purchase Order and update inventory
 * Idempotent-safe
 */
export const receivePurchaseOrder = async (purchaseOrderId) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
  if (!purchaseOrder) {
    throw new AppError('Purchase order not found', 404);
  }

  assertPurchaseOrderTransition({
    currentStatus: purchaseOrder.status,
    nextStatus: 'RECEIVED'
  });

  await applyPurchaseOrderToInventory({ purchaseOrder });

  purchaseOrder.status = 'RECEIVED';
  purchaseOrder.receivedAt = new Date();

  await purchaseOrder.save();

  return purchaseOrder;
};

/**
 * 🔒 Close Purchase Order
 */
export const closePurchaseOrder = async (purchaseOrderId) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);
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