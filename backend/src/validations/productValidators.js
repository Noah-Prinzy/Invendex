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
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU is too long')
    .matches(/^[A-Za-z0-9-_ ]+$/)
    .withMessage('SKU contains unsupported characters'),

  body('skuPrefix')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 24 })
    .withMessage('SKU prefix is too long')
    .matches(/^[A-Za-z0-9-_ ]+$/)
    .withMessage('SKU prefix contains unsupported characters'),

  body('barcode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 128 })
    .withMessage('Barcode is too long'),

  body('barcodeType')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(['CODE128', 'EAN13', 'UPC', 'QR', 'OTHER'])
    .withMessage('barcodeType must be one of CODE128, EAN13, UPC, QR, OTHER'),

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

  body('sku')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU is too long')
    .matches(/^[A-Za-z0-9-_ ]+$/)
    .withMessage('SKU contains unsupported characters'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('barcode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 128 })
    .withMessage('Barcode is too long'),

  body('barcodeType')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(['CODE128', 'EAN13', 'UPC', 'QR', 'OTHER'])
    .withMessage('barcodeType must be one of CODE128, EAN13, UPC, QR, OTHER'),

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

export const createProductsBulkValidator = [
  body('products')
    .isArray({ min: 1, max: 500 })
    .withMessage('products must be an array with 1 to 500 rows'),

  body('fieldMap')
    .optional()
    .isObject()
    .withMessage('fieldMap must be an object'),

  body('options')
    .optional()
    .isObject()
    .withMessage('options must be an object'),

  body('options.validateOnly')
    .optional()
    .isBoolean()
    .withMessage('options.validateOnly must be boolean'),

  body('options.atomic')
    .optional()
    .isBoolean()
    .withMessage('options.atomic must be boolean'),

  body('options.duplicatePolicy')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['skip', 'update', 'fail'])
    .withMessage('options.duplicatePolicy must be one of: skip, update, fail'),

  body('products.*')
    .isObject()
    .withMessage('each product row must be an object')
];

export const bulkImportJobIdValidator = [
  param('jobId').isMongoId().withMessage('Invalid bulk import job ID')
];
