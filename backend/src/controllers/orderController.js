import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import { AppError } from '../errors/AppError.js';
import { successResponse } from '../utils/response.js';
import { recordCogsForCompletedSaleOrder } from '../services/finance/cogsService.js';

const ensureProductsInOrganization = async (organizationId, lines) => {
  const productIds = lines.map((line) => line.product);
  const products = await Product.find({
    organization: organizationId,
    _id: { $in: productIds }
  }).select('_id');

  if (products.length !== productIds.length) {
    throw new AppError(
      'One or more products are not in your organization',
      404
    );
  }
};

const ensureWarehousesInOrganization = async (organizationId, warehouseIds) => {
  const uniqueIds = Array.from(
    new Set(warehouseIds.filter(Boolean).map((id) => String(id)))
  );
  if (!uniqueIds.length) return;

  const warehouses = await Warehouse.find({
    organization: organizationId,
    _id: { $in: uniqueIds }
  }).select('_id');

  if (warehouses.length !== uniqueIds.length) {
    throw new AppError(
      'One or more warehouses are not in your organization',
      404
    );
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const { type, products, warehouse, status = 'pending' } = req.body;

    if (!type || !['purchase', 'sale'].includes(type)) {
      throw new AppError('type must be "purchase" or "sale"', 400);
    }
    if (!Array.isArray(products) || products.length === 0) {
      throw new AppError('products must be a non-empty array', 400);
    }

    await ensureProductsInOrganization(req.organizationId, products);

    if (type === 'sale') {
      for (const line of products) {
        if (Array.isArray(line.serialNumbers) && line.serialNumbers.length) {
          const quantity = Number(line.quantity || 0);
          if (line.serialNumbers.length !== quantity) {
            throw new AppError(
              'serialNumbers count must equal quantity for sale line item',
              400
            );
          }
        }
      }
    }

    const lineWarehouses = products
      .map((line) => line.warehouse || warehouse)
      .filter(Boolean);
    await ensureWarehousesInOrganization(req.organizationId, lineWarehouses);

    const order = await Order.create({
      organization: req.organizationId,
      type,
      warehouse: warehouse || null,
      products,
      status
    });

    if (type === 'sale' && status === 'completed') {
      await recordCogsForCompletedSaleOrder({
        orderId: order._id,
        organizationId: req.organizationId,
        actorUserId: req.user?._id || null
      });
      const refreshed = await Order.findById(order._id);
      return successResponse(
        res,
        refreshed,
        'Order created and completed',
        201
      );
    }

    return successResponse(res, order, 'Order created', 201);
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const query = {
      organization: req.organizationId
    };
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('products.product', 'name sku')
      .populate('products.warehouse', 'name code')
      .populate('warehouse', 'name code');

    return successResponse(res, orders, 'Orders fetched');
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      organization: req.organizationId
    })
      .populate('products.product', 'name sku category')
      .populate('products.warehouse', 'name code')
      .populate('warehouse', 'name code');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    return successResponse(res, order, 'Order fetched');
  } catch (err) {
    next(err);
  }
};

export const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      organization: req.organizationId
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.status === 'completed') {
      return successResponse(res, order, 'Order already completed');
    }
    if (order.status === 'cancelled') {
      throw new AppError('Cancelled order cannot be completed', 409);
    }

    if (order.type === 'sale') {
      await recordCogsForCompletedSaleOrder({
        orderId: order._id,
        organizationId: req.organizationId,
        actorUserId: req.user?._id || null
      });
      const refreshed = await Order.findById(order._id)
        .populate('products.product', 'name sku category')
        .populate('products.warehouse', 'name code')
        .populate('warehouse', 'name code');
      return successResponse(res, refreshed, 'Sale order completed');
    }

    order.status = 'completed';
    await order.save();
    return successResponse(res, order, 'Order completed');
  } catch (err) {
    next(err);
  }
};
