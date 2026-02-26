import { body, param } from 'express-validator';
import { STOCK_REASONS } from '../models/Product.js';

const isWarehouseRequired = () =>
  String(process.env.INVENTORY_ADJUST_REQUIRE_WAREHOUSE_ID || 'true')
    .trim()
    .toLowerCase() === 'true';

/**
 * 🧾 Create Product Validation
 */
export const createProductValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 })
    .withMessage('Product name is too long'),

  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 100 })
    .withMessage('SKU is too long'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('stock')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error('Stock must be a non-negative integer');
      }
      if (parsed !== 0) {
        throw new Error(
          'Initial stock must be 0. Use per-warehouse stock adjustment after product creation.'
        );
      }
      return true;
    }),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer')
];

/**
 * ✏️ Update Product Validation
 */
export const updateProductValidator = [
  param('id').isMongoId().withMessage('Invalid product ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer')
];

/**
 * 📦 Adjust Stock Validation
 */
export const adjustStockValidator = [
  param('id').isMongoId().withMessage('Invalid product ID'),

  body('amount').isInt().withMessage('Amount must be an integer'),

  body('reason')
    .trim()
    .toLowerCase()
    .isIn(STOCK_REASONS)
    .withMessage(`Reason must be one of: ${STOCK_REASONS.join(', ')}`),

  body('warehouseId')
    .custom((warehouseId) => {
      if (isWarehouseRequired() && !warehouseId) {
        throw new Error('warehouseId is required');
      }
      return true;
    })
    .bail()
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid Mongo ID')
];
