import CogsEntry from '../../models/CogsEntry.js';
import Inventory from '../../models/Inventory.js';
import Order from '../../models/Order.js';
import { consumeCostLayers, getEffectiveMethod } from './valuationService.js';
import { consumeOutboundTracking } from '../inventory/trackingService.js';
import { syncProductStockFromInventory } from '../inventory/stockSyncService.js';
import { AppError } from '../../errors/AppError.js';
import { runWithMongoTransactionFallback } from '../../utils/runWithMongoTransactionFallback.js';
import { logAudit } from '../../utils/auditLogger.js';
import {
  publishCogsRecorded,
  publishInventoryUpdated,
  publishValuationUpdated
} from '../../realtime/publisher.js';
import { logger } from '../../observability/logger.js';
import { captureException } from '../../observability/errorTracker.js';
import { logInventoryMutation } from '../../observability/inventoryMutationLogger.js';

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ensureCompletableOrder = (order) => {
  if (!order) throw new AppError('Order not found', 404);
  if (order.type !== 'sale') {
    throw new AppError('COGS can only be recorded for sale orders', 400);
  }
  if (order.status === 'cancelled') {
    throw new AppError('Cancelled orders cannot be completed', 409);
  }
};

const computeLineRevenue = (line) => {
  const quantity = Number(line.quantity || 0);
  const unitSalePrice = Number(line.unitSalePrice || 0);
  const discountAmount = Number(line.discountAmount || 0);
  const taxAmount = Number(line.taxAmount || 0);
  return roundMoney(quantity * unitSalePrice - discountAmount + taxAmount);
};

export const recordCogsForCompletedSaleOrder = async ({
  orderId,
  organizationId,
  actorUserId = null
}) => {
  const runMutation = async (session) => {
    let createdEntries = [];
    let orderWarehouse = null;

    const orderQuery = Order.findOne({
      _id: orderId,
      organization: organizationId
    });
    if (session) {
      orderQuery.session(session);
    }
    const order = await orderQuery;

    ensureCompletableOrder(order);
    orderWarehouse = order.warehouse ? String(order.warehouse) : null;

    const existingEntriesQuery = CogsEntry.find({
      organization: organizationId,
      orderId: order._id
    });
    if (session) {
      existingEntriesQuery.session(session);
    }
    const existingEntries = await existingEntriesQuery;

    if (existingEntries.length > 0) {
      if (order.status !== 'completed') {
        order.status = 'completed';
        await order.save(session ? { session } : undefined);
      }
      createdEntries = existingEntries;
      return { createdEntries, orderWarehouse };
    }

    const method = await getEffectiveMethod(organizationId);
    const now = new Date();

    const perLineEntries = [];
    let orderSubtotalRevenue = 0;
    let orderDiscount = 0;
    let orderTax = 0;

    for (let idx = 0; idx < order.products.length; idx += 1) {
      const line = order.products[idx];
      const quantity = Number(line.quantity || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new AppError(`Invalid sale quantity at line ${idx + 1}`, 400);
      }

      const warehouseId = line.warehouse || order.warehouse;
      if (!warehouseId) {
        throw new AppError(
          `Warehouse is required for sale line ${idx + 1}`,
          400
        );
      }

      if (!Number.isFinite(Number(line.unitSalePrice))) {
        throw new AppError(
          `unitSalePrice is required for sale line ${idx + 1}`,
          400
        );
      }

      const inventoryOptions = {
        new: true
      };
      if (session) {
        inventoryOptions.session = session;
      }

      const inventory = await Inventory.findOneAndUpdate(
        {
          organization: organizationId,
          product: line.product,
          warehouse: warehouseId,
          quantityOnHand: { $gte: quantity }
        },
        {
          $inc: { quantityOnHand: -quantity },
          $set: { lastMovementAt: now }
        },
        inventoryOptions
      );

      if (!inventory) {
        throw new AppError(
          `Insufficient inventory for product ${line.product} in warehouse ${warehouseId}`,
          409
        );
      }

      logInventoryMutation({
        operation: 'sale_order_complete',
        organizationId,
        warehouseId,
        productId: line.product,
        quantityDelta: -quantity,
        quantityOnHand: inventory.quantityOnHand,
        quantityReserved: inventory.quantityReserved,
        sourceType: 'ORDER',
        sourceId: order._id,
        actorUserId
      });

      const consumed = await consumeCostLayers({
        organizationId,
        productId: line.product,
        warehouseId,
        quantity,
        method,
        session
      });

      await consumeOutboundTracking({
        organizationId,
        productId: line.product,
        warehouseId,
        quantity,
        lotNumber: line.lotNumber || null,
        serialNumbers: line.serialNumbers || [],
        sourceType: 'ORDER',
        sourceId: order._id,
        movedBy: actorUserId,
        reason: 'Sale order completed',
        session
      });

      await syncProductStockFromInventory({
        organizationId,
        productId: line.product,
        session
      });

      line.lineRevenue = computeLineRevenue(line);
      orderSubtotalRevenue += roundMoney(
        quantity * Number(line.unitSalePrice || 0)
      );
      orderDiscount += Number(line.discountAmount || 0);
      orderTax += Number(line.taxAmount || 0);

      let entry;
      if (session) {
        [entry] = await CogsEntry.create(
          [
            {
              organization: organizationId,
              orderId: order._id,
              product: line.product,
              warehouse: warehouseId,
              quantitySold: quantity,
              valuationMethod: consumed.valuationMethod,
              totalCogs: consumed.totalCost,
              unitCogs: consumed.unitCost,
              consumedLayers: consumed.consumedLayers,
              orderLineIndex: idx,
              recordedAt: now
            }
          ],
          { session }
        );
      } else {
        entry = await CogsEntry.create({
          organization: organizationId,
          orderId: order._id,
          product: line.product,
          warehouse: warehouseId,
          quantitySold: quantity,
          valuationMethod: consumed.valuationMethod,
          totalCogs: consumed.totalCost,
          unitCogs: consumed.unitCost,
          consumedLayers: consumed.consumedLayers,
          orderLineIndex: idx,
          recordedAt: now
        });
      }

      perLineEntries.push(entry);
    }

    order.subtotalRevenue = roundMoney(orderSubtotalRevenue);
    order.totalDiscount = roundMoney(orderDiscount);
    order.totalTax = roundMoney(orderTax);
    order.netRevenue = roundMoney(
      orderSubtotalRevenue - orderDiscount + orderTax
    );
    order.status = 'completed';
    await order.save(session ? { session } : undefined);

    await logAudit({
      action: 'COMPLETE_SALE_ORDER_WITH_COGS',
      entity: 'ORDER',
      entityId: order._id,
      organizationId,
      source: 'system',
      success: true,
      meta: {
        warehouseId: orderWarehouse,
        orderStatus: order.status,
        lineCount: order.products.length,
        cogsEntriesCount: perLineEntries.length,
        actorUserId: actorUserId ? String(actorUserId) : null
      },
      session,
      silent: true
    });

    createdEntries = perLineEntries;
    return { createdEntries, orderWarehouse };
  };

  try {
    const result = await runWithMongoTransactionFallback({
      operationName: 'record_cogs_for_completed_sale_order',
      operationMeta: {
        orderId: String(orderId),
        organizationId: String(organizationId)
      },
      runWithSession: runMutation
    });

    const createdEntries = result?.createdEntries || [];
    const orderWarehouse = result?.orderWarehouse || null;

    for (const entry of createdEntries) {
      publishCogsRecorded({
        organizationId,
        actorUserId,
        warehouseId: entry.warehouse,
        cogsEntry: entry
      });

      publishInventoryUpdated({
        organizationId,
        actorUserId,
        warehouseId: entry.warehouse,
        entityId: entry.product,
        data: {
          reason: 'sale_order_completed',
          orderId
        }
      });
    }

    publishValuationUpdated({
      organizationId,
      actorUserId,
      warehouseId: orderWarehouse,
      data: {
        reason: 'sale_order_completed',
        orderId
      }
    });

    return createdEntries;
  } catch (err) {
    logger.error('cogs_transaction_failed', {
      orderId: String(orderId),
      organizationId: String(organizationId),
      err
    });
    await captureException(err, {
      scope: 'finance_cogs_transaction',
      orderId: String(orderId),
      organizationId: String(organizationId)
    });
    throw err;
  }
};

export default {
  recordCogsForCompletedSaleOrder
};
