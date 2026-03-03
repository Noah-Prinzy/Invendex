import Product from '../../models/Product.js';
import Inventory from '../../models/Inventory.js';
import InventorySnapshot from '../../models/InventorySnapshot.js';
import ReorderAlert from '../../models/ReorderAlert.js';
import AppError from '../../utils/AppError.js';
import { addCostLayerFromReceipt } from '../finance/valuationService.js';
import { recordInboundTrackingForReceipt } from './trackingService.js';
import { syncProductStockFromInventory } from './stockSyncService.js';
import {
  convertQuantityToBaseUnits,
  resolvePurchaseToBaseFactor
} from './uomConversionService.js';
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
  actorUserId = null,
  session = null,
  deferRealtimePublish = false
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

  const pendingInventoryRealtimeEvents = [];

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
    let snapshotRecord = null;

    try {
      const productQuery = Product.findOne({
        _id: productId,
        organization: purchaseOrder.organization
      }).select('sku price stock uom');
      if (session) {
        productQuery.session(session);
      }
      const product = await productQuery;
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

      const purchaseToBaseFactor = resolvePurchaseToBaseFactor({
        product,
        overrideFactor: item?.purchaseToBaseFactor
      });
      const quantityInBaseUnits = convertQuantityToBaseUnits({
        quantity,
        quantityUnit: 'purchase',
        purchaseToBaseFactor
      });
      if (!Number.isFinite(quantityInBaseUnits) || quantityInBaseUnits <= 0) {
        throw new AppError(
          `Invalid converted quantity for inventory update (${productId})`,
          400
        );
      }
      const unitCostPerBaseUnit = Number(
        (Number(item.unitCost || 0) / purchaseToBaseFactor).toFixed(6)
      );

      const now = new Date();

      // Idempotency gate: only one receiver can claim snapshot creation.
      const idempotencySnapshotPayload = {
        organization: purchaseOrder.organization,
        product: productId,
        warehouse: purchaseOrder.warehouse,
        purchaseOrder: purchaseOrder._id,
        sku: product.sku,
        stock: Number(product.stock || 0),
        price: product.price,
        recordedAt: now,
        source: 'SYSTEM'
      };

      try {
        if (session) {
          [snapshotRecord] = await InventorySnapshot.create(
            [idempotencySnapshotPayload],
            { session }
          );
        } else {
          snapshotRecord = await InventorySnapshot.create(
            idempotencySnapshotPayload
          );
        }
      } catch (err) {
        if (err?.code === 11000) {
          continue;
        }
        throw err;
      }

      const inventoryOptions = {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      };
      if (session) {
        inventoryOptions.session = session;
      }

      const inventory = await Inventory.findOneAndUpdate(
        {
          organization: purchaseOrder.organization,
          product: productId,
          warehouse: purchaseOrder.warehouse
        },
        {
          $inc: { quantityOnHand: quantityInBaseUnits },
          $set: { lastMovementAt: now },
          $setOnInsert: {
            quantityReserved: 0,
            reorderPoint: 0,
            reorderQuantity: 0
          }
        },
        inventoryOptions
      );

      const previousStock = Number(product.stock || 0);

      const syncedProduct = await syncProductStockFromInventory({
        organizationId: purchaseOrder.organization,
        productId,
        session
      });
      const newStock = Number(syncedProduct.stock || 0);

      await InventorySnapshot.findByIdAndUpdate(
        snapshotRecord._id,
        {
          $set: {
            stock: newStock,
            recordedAt: now,
            source: 'SYSTEM'
          }
        },
        session ? { session } : undefined
      );

      await addCostLayerFromReceipt({
        organizationId: purchaseOrder.organization,
        productId,
        warehouseId: purchaseOrder.warehouse,
        sourceType: 'PURCHASE_ORDER',
        sourceId: purchaseOrder._id,
        unitCost: unitCostPerBaseUnit,
        quantity: quantityInBaseUnits,
        receivedAt: now,
        session
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
        purchaseToBaseFactor,
        sourceType: 'PURCHASE_ORDER',
        sourceId: purchaseOrder._id,
        movedBy: actorUserId,
        session
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
          },
          session ? { session } : undefined
        );
      }

      logInventoryMutation({
        operation: 'purchase_order_receive',
        organizationId: purchaseOrder.organization,
        warehouseId: purchaseOrder.warehouse,
        productId,
        quantityDelta: quantityInBaseUnits,
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        sourceType: 'PURCHASE_ORDER',
        sourceId: purchaseOrder._id,
        actorUserId
      });

      pendingInventoryRealtimeEvents.push({
        organizationId: purchaseOrder.organization,
        actorUserId,
        warehouseId: purchaseOrder.warehouse,
        entityId: productId,
        data: {
          source: 'purchase_order_receive',
          purchaseOrderId: purchaseOrder._id,
          quantityDelta: quantityInBaseUnits,
          purchaseQuantity: Number(quantity),
          purchaseToBaseFactor,
          quantityOnHand: inventory.quantityOnHand,
          previousStock,
          newStock
        }
      });
    } catch (err) {
      if (snapshotRecord?._id) {
        await InventorySnapshot.deleteOne(
          {
            _id: snapshotRecord._id
          },
          session ? { session } : undefined
        );
      }
      throw err;
    }
  }

  const pendingValuationRealtimeEvent = {
    organizationId: purchaseOrder.organization,
    actorUserId,
    warehouseId: purchaseOrder.warehouse,
    data: {
      reason: 'purchase_order_receive',
      purchaseOrderId: purchaseOrder._id
    }
  };

  if (!deferRealtimePublish) {
    for (const realtimePayload of pendingInventoryRealtimeEvents) {
      publishInventoryUpdated(realtimePayload);
    }

    publishValuationUpdated(pendingValuationRealtimeEvent);
  }

  return {
    inventoryRealtimeEvents: pendingInventoryRealtimeEvents,
    valuationRealtimeEvent: pendingValuationRealtimeEvent
  };
};

export default {
  applyPurchaseOrderToInventory
};
