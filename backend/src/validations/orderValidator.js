import mongoose from 'mongoose';
import { body, param, query } from 'express-validator';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

const ORDER_TYPES = ['purchase', 'sale'];
const ORDER_STATUSES = ['pending', 'completed', 'cancelled'];

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const createOrderValidator = [
  body('type')
    .exists({ checkFalsy: true })
    .withMessage('type is required')
    .bail()
    .isIn(ORDER_TYPES)
    .withMessage('type must be purchase or sale'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(ORDER_STATUSES)
    .withMessage('status must be pending, completed, or cancelled'),
  body('warehouse')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouse must be a valid ID')
    .bail()
    .custom(async (warehouseId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Warehouse.exists({
        _id: warehouseId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Warehouse not found');
      }
      return true;
    }),
  body('products')
    .isArray({ min: 1 })
    .withMessage('products must be a non-empty array')
    .bail()
    .custom(async (items, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const orderType = String(req.body?.type || '').toLowerCase();
      const topLevelWarehouse = req.body?.warehouse || null;

      const normalizedItems = Array.isArray(items) ? items : [];

      const productIds = [
        ...new Set(
          normalizedItems
            .map((item) => item?.product)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        )
      ];

      if (productIds.length > 0) {
        const productCount = await Product.countDocuments({
          _id: { $in: productIds },
          organization: organizationId
        });
        if (productCount !== productIds.length) {
          throw new Error(
            'One or more products were not found in your organization'
          );
        }
      }

      const lineWarehouseIds = new Set();
      for (const item of normalizedItems) {
        if (
          item?.warehouse &&
          mongoose.Types.ObjectId.isValid(item.warehouse)
        ) {
          lineWarehouseIds.add(String(item.warehouse));
        }

        if (orderType === 'sale') {
          const effectiveWarehouse = item?.warehouse || topLevelWarehouse;
          if (!effectiveWarehouse) {
            throw new Error(
              'warehouse is required per sale line item (or set top-level warehouse)'
            );
          }

          if (!Number.isFinite(Number(item?.unitSalePrice))) {
            throw new Error(
              'unitSalePrice is required for each sale line item'
            );
          }

          const quantity = Number(item?.quantity || 0);
          const serialNumbers = Array.isArray(item?.serialNumbers)
            ? item.serialNumbers
            : [];

          if (serialNumbers.length) {
            const normalizedSerials = serialNumbers
              .map((serial) =>
                String(serial || '')
                  .trim()
                  .toUpperCase()
              )
              .filter(Boolean);

            if (normalizedSerials.length !== serialNumbers.length) {
              throw new Error('serialNumbers cannot contain blank values');
            }

            if (new Set(normalizedSerials).size !== normalizedSerials.length) {
              throw new Error('serialNumbers must be unique per line item');
            }

            if (normalizedSerials.length !== quantity) {
              throw new Error(
                'serialNumbers count must equal quantity for sale line item'
              );
            }
          }
        }
      }

      const warehouseIdsToValidate = [
        ...(topLevelWarehouse &&
        mongoose.Types.ObjectId.isValid(topLevelWarehouse)
          ? [String(topLevelWarehouse)]
          : []),
        ...lineWarehouseIds
      ];

      if (warehouseIdsToValidate.length > 0) {
        const warehouseCount = await Warehouse.countDocuments({
          _id: { $in: warehouseIdsToValidate },
          organization: organizationId
        });
        if (warehouseCount !== warehouseIdsToValidate.length) {
          throw new Error(
            'One or more warehouses were not found in your organization'
          );
        }
      }

      return true;
    }),
  body('products.*.product')
    .exists({ checkFalsy: true })
    .withMessage('product is required for each line item')
    .bail()
    .isMongoId()
    .withMessage('product must be a valid ID'),
  body('products.*.quantity')
    .exists({ checkFalsy: true })
    .withMessage('quantity is required for each line item')
    .bail()
    .isInt({ min: 1 })
    .withMessage('quantity must be a positive integer')
    .toInt(),
  body('products.*.warehouse')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('line-item warehouse must be a valid ID'),
  body('products.*.unitSalePrice')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('unitSalePrice must be a non-negative number')
    .toFloat(),
  body('products.*.discountAmount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('discountAmount must be a non-negative number')
    .toFloat(),
  body('products.*.taxAmount')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('taxAmount must be a non-negative number')
    .toFloat(),
  body('products.*.lotNumber')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('lotNumber must be a string')
    .bail()
    .isLength({ max: 120 })
    .withMessage('lotNumber must be at most 120 characters'),
  body('products.*.serialNumbers')
    .optional()
    .isArray()
    .withMessage('serialNumbers must be an array')
];

export const orderIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Order ID must be a valid Mongo ID')
    .bail()
    .custom(async (orderId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Order.exists({
        _id: orderId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Order not found');
      }
      return true;
    })
];

export const orderQueryValidator = [
  query('type')
    .optional({ values: 'falsy' })
    .isIn(ORDER_TYPES)
    .withMessage('type must be purchase or sale'),
  query('status')
    .optional({ values: 'falsy' })
    .isIn(ORDER_STATUSES)
    .withMessage('status must be pending, completed, or cancelled')
];
