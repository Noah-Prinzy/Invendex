import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';

import { successResponse } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

import {
  generatePurchaseOrdersFromAlerts as generatePOsFromAlertsService,
  sendPurchaseOrder as sendPurchaseOrderService,
  receivePurchaseOrder as receivePurchaseOrderService,
  closePurchaseOrder as closePurchaseOrderService
} from '../services/purchaseOrderService.js';

import { calculatePurchaseOrderTotals } from '../utils/calculatePurchaseOrderTotals.js';

/**
 * ➕ Create Purchase Order
 */
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplier, items, expectedDeliveryDate, notes } = req.body;

    if (!supplier || !items || !items.length) {
      throw new AppError('Supplier and items are required', 400);
    }

    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      throw new AppError('Supplier not found', 404);
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
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
      supplier,
      items: calculatedItems,
      totalQuantity,
      totalAmount,
      expectedDeliveryDate,
      notes,
      status: 'DRAFT',
      createdBy: req.user._id
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
    const orders = await PurchaseOrder.find()
      .sort({ createdAt: -1 })
      .populate('supplier', 'name')
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
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone')
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

    const purchaseOrder = await receivePurchaseOrderService(id);

    return successResponse(
      res,
      purchaseOrder,
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

    const purchaseOrder = await sendPurchaseOrderService(id);

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

    const purchaseOrder = await closePurchaseOrderService(id);

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
    const orders = await generatePOsFromAlertsService();

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