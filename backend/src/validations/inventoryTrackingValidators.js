import { body, param, query } from 'express-validator';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const listInventoryBatchesValidator = [
  query('productId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('productId must be a valid ID')
    .bail()
    .custom(async (productId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Product.exists({
        _id: productId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Product not found');
      }
      return true;
    }),
  query('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
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
  query('includeRecalled')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('includeRecalled must be a boolean')
    .toBoolean(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be an integer between 1 and 500')
    .toInt()
];

export const listInventorySerialsValidator = [
  query('productId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('productId must be a valid ID')
    .bail()
    .custom(async (productId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Product.exists({
        _id: productId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Product not found');
      }
      return true;
    }),
  query('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
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
  query('status')
    .optional({ values: 'falsy' })
    .isIn([
      'AVAILABLE',
      'RESERVED',
      'SOLD',
      'DAMAGED',
      'RETURNED',
      'RECALL_HOLD'
    ])
    .withMessage(
      'status must be AVAILABLE, RESERVED, SOLD, DAMAGED, RETURNED, or RECALL_HOLD'
    ),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be an integer between 1 and 1000')
    .toInt()
];

export const recallBatchValidator = [
  body('productId')
    .exists({ checkFalsy: true })
    .withMessage('productId is required')
    .bail()
    .isMongoId()
    .withMessage('productId must be a valid ID')
    .bail()
    .custom(async (productId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Product.exists({
        _id: productId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Product not found');
      }
      return true;
    }),
  body('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
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
  body('lotNumber')
    .exists({ checkFalsy: true })
    .withMessage('lotNumber is required')
    .bail()
    .isString()
    .withMessage('lotNumber must be a string'),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('reason must be a string')
    .bail()
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters')
];

export const serialHistoryValidator = [
  param('serialNumber')
    .exists({ checkFalsy: true })
    .withMessage('serialNumber is required')
    .bail()
    .isString()
    .withMessage('serialNumber must be a string')
    .bail()
    .isLength({ min: 1, max: 120 })
    .withMessage('serialNumber must be between 1 and 120 characters'),
  query('productId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('productId must be a valid ID')
    .bail()
    .custom(async (productId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Product.exists({
        _id: productId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Product not found');
      }
      return true;
    })
];

export const reserveSerialsValidator = [
  body('productId')
    .exists({ checkFalsy: true })
    .withMessage('productId is required')
    .bail()
    .isMongoId()
    .withMessage('productId must be a valid ID')
    .bail()
    .custom(async (productId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Product.exists({
        _id: productId,
        organization: organizationId
      });
      if (!exists) throw new Error('Product not found');
      return true;
    }),
  body('warehouseId')
    .exists({ checkFalsy: true })
    .withMessage('warehouseId is required')
    .bail()
    .isMongoId()
    .withMessage('warehouseId must be a valid ID')
    .bail()
    .custom(async (warehouseId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Warehouse.exists({
        _id: warehouseId,
        organization: organizationId
      });
      if (!exists) throw new Error('Warehouse not found');
      return true;
    }),
  body('serialNumbers')
    .optional()
    .isArray()
    .withMessage('serialNumbers must be an array'),
  body('quantity')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 1000 })
    .withMessage('quantity must be an integer between 1 and 1000')
    .toInt(),
  body('referenceType')
    .optional({ values: 'falsy' })
    .isIn(['ORDER', 'PICK_TICKET', 'MANUAL', 'SYSTEM'])
    .withMessage('referenceType must be ORDER, PICK_TICKET, MANUAL, or SYSTEM')
];

export const releaseSerialsValidator = [
  body('serialNumbers')
    .exists()
    .withMessage('serialNumbers is required')
    .bail()
    .isArray({ min: 1 })
    .withMessage('serialNumbers must be a non-empty array')
];

export const verifySerialScanValidator = [
  body('serialNumber')
    .exists({ checkFalsy: true })
    .withMessage('serialNumber is required')
    .bail()
    .isString()
    .withMessage('serialNumber must be a string')
    .bail()
    .isLength({ min: 1, max: 120 })
    .withMessage('serialNumber must be between 1 and 120 characters'),
  body('productId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('productId must be a valid ID'),
  body('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid ID'),
  body('expectedStatuses')
    .optional()
    .isArray()
    .withMessage('expectedStatuses must be an array')
];
