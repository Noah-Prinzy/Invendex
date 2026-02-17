import Product from '../../models/Product.js';
import Inventory from '../../models/Inventory.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import ReorderAlert from '../../models/ReorderAlert.js';
import AppError from '../../utils/AppError.js';
import { addCostLayerFromReceipt } from '../finance/valuationService.js';
import { recordInboundTrackingForReceipt } from './trackingService.js';
import {
  publishInventoryUpdated,
  publishValuationUpdated
} from '../../realtime/publisher.js';
import { logInventoryMutation } from '../../observability/inventoryMutationLogger.js';

/**
 * Applies inventory updates when a Purchase Order is received.
 * Idempotent per purchaseOrder + product
 */
export const applyPurchaseOrderToInventory = async ({
  purchaseOrder,
  actorUserId = null
}) => {
  if (
    !purchaseOrder ||
    !purchaseOrder.items?.length ||
    !purchaseOrder.warehouse ||
    !purchaseOrder.organization
  ) {
    throw new AppError(
      'Invalid purchase order supplied to inventory service',
      400
    );
  }

  for (const item of purchaseOrder.items) {
    const {
      product: productId,
      quantity,
      reorderAlert,
      trackingType = 'NONE',
      lotNumber = null,
      expiryDate = null,
      serialNumbers = []
    } = item;

    // Idempotency per purchase order + product.
    const existingSnapshot = await InventorySnapshot.findOne({
      organization: purchaseOrder.organization,
      product: productId,
      purchaseOrder: purchaseOrder._id,
      warehouse: purchaseOrder.warehouse
    });

    if (existingSnapshot) {
      continue;
    }

    const product = await Product.findOne({
      _id: productId,
      organization: purchaseOrder.organization
    }).select('sku price');
    if (!product) {
      throw new AppError(
        `Product not found for inventory update (${productId})`,
        404
      );
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError(
        `Invalid item quantity for inventory update (${productId})`,
        400
      );
    }

    const now = new Date();
    const inventory = await Inventory.findOneAndUpdate(
      {
        organization: purchaseOrder.organization,
        product: productId,
        warehouse: purchaseOrder.warehouse
      },
      {
        $inc: { quantityOnHand: quantity },
        $set: { lastMovementAt: now },
        $setOnInsert: {
          quantityReserved: 0,
          reorderPoint: 0,
          reorderQuantity: 0
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    const previousStock = inventory.quantityOnHand - quantity;

    // Record a snapshot for analytics and PO idempotency.
    await InventorySnapshot.create({
      organization: purchaseOrder.organization,
      product: productId,
      warehouse: purchaseOrder.warehouse,
      purchaseOrder: purchaseOrder._id,
      sku: product.sku,
      stock: inventory.quantityOnHand,
      price: product.price,
      recordedAt: now,
      source: 'SYSTEM',
      change: quantity,
      previousStock,
      newStock: inventory.quantityOnHand
    });

    await addCostLayerFromReceipt({
      organizationId: purchaseOrder.organization,
      productId,
      warehouseId: purchaseOrder.warehouse,
      sourceType: 'PURCHASE_ORDER',
      sourceId: purchaseOrder._id,
      unitCost: item.unitCost,
      quantity,
      receivedAt: now
    });

    await recordInboundTrackingForReceipt({
      organizationId: purchaseOrder.organization,
      productId,
      warehouseId: purchaseOrder.warehouse,
      quantity,
      trackingType,
      lotNumber,
      expiryDate,
      serialNumbers,
      sourceType: 'PURCHASE_ORDER',
      sourceId: purchaseOrder._id,
      movedBy: actorUserId
    });

    // Resolve linked reorder alert (if any).
    if (reorderAlert) {
      await ReorderAlert.findOneAndUpdate(
        {
          _id: reorderAlert,
          organization: purchaseOrder.organization
        },
        {
          resolved: true,
          resolvedAt: new Date()
        }
      );
    }

    logInventoryMutation({
      operation: 'purchase_order_receive',
      organizationId: purchaseOrder.organization,
      warehouseId: purchaseOrder.warehouse,
      productId,
      quantityDelta: quantity,
      quantityOnHand: inventory.quantityOnHand,
      quantityReserved: inventory.quantityReserved,
      sourceType: 'PURCHASE_ORDER',
      sourceId: purchaseOrder._id,
      actorUserId
    });

    publishInventoryUpdated({
      organizationId: purchaseOrder.organization,
      actorUserId,
      warehouseId: purchaseOrder.warehouse,
      entityId: productId,
      data: {
        source: 'purchase_order_receive',
        purchaseOrderId: purchaseOrder._id,
        quantityDelta: quantity,
        quantityOnHand: inventory.quantityOnHand
      }
    });
  }

  publishValuationUpdated({
    organizationId: purchaseOrder.organization,
    actorUserId,
    warehouseId: purchaseOrder.warehouse,
    data: {
      reason: 'purchase_order_receive',
      purchaseOrderId: purchaseOrder._id
    }
  });
};

export default {
  applyPurchaseOrderToInventory
};
