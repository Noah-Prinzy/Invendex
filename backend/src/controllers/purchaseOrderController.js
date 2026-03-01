import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

import {
  generatePurchaseOrdersFromAlerts as generatePOsFromAlertsService,
  sendPurchaseOrder as sendPurchaseOrderService,
  receivePurchaseOrder as receivePurchaseOrderService,
  closePurchaseOrder as closePurchaseOrderService
} from '../services/purchaseOrderService.js';

import { calculatePurchaseOrderTotals } from '../utils/calculatePurchaseOrderTotals.js';
import {
  publishPurchaseOrderCreated,
  publishPurchaseOrderReceived,
  publishPurchaseOrderUpdated
} from '../realtime/publisher.js';
import { createInAppNotification } from '../services/notifications/inAppNotificationService.js';
import {
  extractIdempotencyKeyFromRequest,
  IDEMPOTENCY_SCOPE,
  runIdempotentOperation
} from '../services/idempotency/idempotencyService.js';

/**
 * ➕ Create Purchase Order
 */
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, warehouse, items, expectedDeliveryDate, notes } =
      req.body;
    const organizationId = req.organizationId;

    if (!supplier || !warehouse || !items || !items.length) {
      throw new AppError('Supplier, warehouse, and items are required', 400);
    }

    const supplierExists = await Supplier.findOne({
      _id: supplier,
      organization: organizationId
    });
    if (!supplierExists) {
      throw new AppError('Supplier not found', 404);
    }

    const warehouseExists = await Warehouse.findOne({
      _id: warehouse,
      organization: organizationId
    });
    if (!warehouseExists) {
      throw new AppError('Warehouse not found', 404);
    }

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        organization: organizationId
      });
      if (!product) {
        throw new AppError(`Product not found: ${item.product}`, 404);
      }
    }

    const {
      items: calculatedItems,
      totalQuantity,
      totalAmount
    } = calculatePurchaseOrderTotals(items);

    const purchaseOrder = await PurchaseOrder.create({
      organization: organizationId,
      supplier,
      warehouse,
      items: calculatedItems,
      totalQuantity,
      totalAmount,
      expectedDeliveryDate,
      notes,
      status: 'DRAFT',
      createdBy: req.user._id
    });

    publishPurchaseOrderCreated({
      organizationId,
      actorUserId: req.user?._id || null,
      purchaseOrder
    });

    await createInAppNotification({
      organizationId,
      actorUserId: req.user?._id || null,
      type: 'purchase_order_created',
      title: `PO ${purchaseOrder.poNumber || purchaseOrder._id} created`,
      message: `Purchase order created with ${purchaseOrder.items?.length || 0} item(s).`,
      severity: 'info',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrder._id,
      metadata: {
        status: purchaseOrder.status,
        supplierId: purchaseOrder.supplier,
        warehouseId: purchaseOrder.warehouse
      }
    });

    return successResponse(
      res,
      purchaseOrder,
      'Purchase order created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📄 Get all Purchase Orders
 */
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.find({
      organization: req.organizationId
    })
      .sort({ createdAt: -1 })
      .populate('supplier', 'name')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku');

    return successResponse(res, orders, 'Purchase orders fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 🔍 Get Purchase Order by ID
 */
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      organization: req.organizationId
    })
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku')
      .populate('items.reorderAlert');

    if (!order) {
      throw new AppError('Purchase order not found', 404);
    }

    return successResponse(res, order, 'Purchase order fetched successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * 📥 Receive Purchase Order
 */
export const receivePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idempotencyKey = extractIdempotencyKeyFromRequest(req);

    const operation = await runIdempotentOperation({
      organizationId: req.organizationId,
      scope: IDEMPOTENCY_SCOPE.RECEIVE_PURCHASE_ORDER,
      idempotencyKey,
      requestFingerprint: {
        purchaseOrderId: String(id),
        organizationId: String(req.organizationId)
      },
      operation: async () => {
        const purchaseOrder = await receivePurchaseOrderService({
          purchaseOrderId: id,
          userId: req.user?._id,
          organizationId: req.organizationId
        });

        publishPurchaseOrderReceived({
          organizationId: req.organizationId,
          actorUserId: req.user?._id || null,
          purchaseOrder
        });

        await createInAppNotification({
          organizationId: req.organizationId,
          actorUserId: req.user?._id || null,
          type: 'purchase_order_received',
          title: `PO ${purchaseOrder.poNumber || purchaseOrder._id} received`,
          message: 'Inventory has been updated from this receipt.',
          severity: 'info',
          entityType: 'PURCHASE_ORDER',
          entityId: purchaseOrder._id,
          metadata: {
            status: purchaseOrder.status,
            warehouseId: purchaseOrder.warehouse
          }
        });

        return purchaseOrder;
      }
    });

    if (operation.keyUsed) {
      res.setHeader('X-Idempotency-Key', String(idempotencyKey));
    }
    if (operation.replayed) {
      res.setHeader('X-Idempotency-Replayed', 'true');
    }

    return successResponse(
      res,
      operation.result,
      'Purchase order received successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 📤 Send Purchase Order
 */
export const sendPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await sendPurchaseOrderService({
      purchaseOrderId: id,
      userId: req.user?._id,
      organizationId: req.organizationId
    });

    publishPurchaseOrderUpdated({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      purchaseOrder
    });

    await createInAppNotification({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      type: 'purchase_order_updated',
      title: `PO ${purchaseOrder.poNumber || purchaseOrder._id} sent`,
      message: 'Purchase order status moved to SENT.',
      severity: 'info',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrder._id,
      metadata: {
        status: purchaseOrder.status,
        warehouseId: purchaseOrder.warehouse
      }
    });

    return successResponse(
      res,
      purchaseOrder,
      'Purchase order sent to supplier'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🔒 Close Purchase Order
 */
export const closePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await closePurchaseOrderService({
      purchaseOrderId: id,
      organizationId: req.organizationId
    });

    publishPurchaseOrderUpdated({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      purchaseOrder
    });

    await createInAppNotification({
      organizationId: req.organizationId,
      actorUserId: req.user?._id || null,
      type: 'purchase_order_updated',
      title: `PO ${purchaseOrder.poNumber || purchaseOrder._id} closed`,
      message: 'Purchase order status moved to CLOSED.',
      severity: 'info',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrder._id,
      metadata: {
        status: purchaseOrder.status,
        warehouseId: purchaseOrder.warehouse
      }
    });

    return successResponse(
      res,
      purchaseOrder,
      'Purchase order closed successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * 🤖 Generate Purchase Orders from Reorder Alerts
 */
export const generatePurchaseOrdersFromAlerts = async (req, res, next) => {
  try {
    const orders = await generatePOsFromAlertsService({
      createdByUserId: req.user?._id,
      warehouseId: req.body?.warehouse,
      organizationId: req.organizationId
    });

    for (const order of orders) {
      publishPurchaseOrderCreated({
        organizationId: req.organizationId,
        actorUserId: req.user?._id || null,
        purchaseOrder: order
      });

      await createInAppNotification({
        organizationId: req.organizationId,
        actorUserId: req.user?._id || null,
        type: 'purchase_order_created',
        title: `PO ${order.poNumber || order._id} auto-generated`,
        message: 'Reorder engine generated a purchase order draft.',
        severity: 'warning',
        entityType: 'PURCHASE_ORDER',
        entityId: order._id,
        metadata: {
          status: order.status,
          source: order.source
        }
      });
    }

    return successResponse(
      res,
      {
        created: orders.length,
        orders
      },
      'Purchase orders generated from reorder alerts'
    );
  } catch (err) {
    next(err);
  }
};
