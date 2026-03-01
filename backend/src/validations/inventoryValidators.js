import { body, param, query } from 'express-validator';

import Product from '../models/Product.js';
import ReorderAlert from '../models/ReorderAlert.js';

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const inventoryProductParamValidator = [
  param('productId')
    .isMongoId()
    .withMessage('Invalid product ID')
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

export const createManualReorderAlertValidator = [
  body('productId')
    .notEmpty()
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
    })
];

export const resolveReorderAlertParamValidator = [
  param('alertId')
    .isMongoId()
    .withMessage('Invalid reorder alert ID')
    .bail()
    .custom(async (alertId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await ReorderAlert.exists({
        _id: alertId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Reorder alert not found');
      }
      return true;
    })
];

export const reorderIntelligenceQueryValidator = [
  query('days')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 3650 })
    .withMessage('days must be an integer between 1 and 3650')
];

export const createStocktakeSessionValidator = [
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId is required')
    .bail()
    .isMongoId()
    .withMessage('warehouseId must be a valid Mongo ID'),

  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 180 })
    .withMessage('title must be between 1 and 180 characters'),

  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('notes must be 2000 characters or fewer'),

  body('productIds')
    .optional()
    .isArray({ min: 1, max: 1000 })
    .withMessage('productIds must be an array with 1 to 1000 IDs'),

  body('productIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each productIds entry must be a valid Mongo ID')
];

export const stocktakeSessionIdParamValidator = [
  param('sessionId').isMongoId().withMessage('Invalid stocktake session ID')
];

export const submitStocktakeCountsValidator = [
  param('sessionId').isMongoId().withMessage('Invalid stocktake session ID'),

  body('counts')
    .isArray({ min: 1, max: 2000 })
    .withMessage('counts must be an array with 1 to 2000 rows'),

  body('counts.*.productId')
    .notEmpty()
    .withMessage('counts[].productId is required')
    .bail()
    .isMongoId()
    .withMessage('counts[].productId must be a valid Mongo ID'),

  body('counts.*.countedQuantity')
    .isInt({ min: 0 })
    .withMessage('counts[].countedQuantity must be a non-negative integer')
];

export const stocktakeListQueryValidator = [
  query('warehouseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('warehouseId must be a valid Mongo ID'),

  query('status')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(['OPEN', 'IN_REVIEW', 'APPROVED', 'CANCELLED'])
    .withMessage('status must be one of OPEN, IN_REVIEW, APPROVED, CANCELLED'),

  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 200 })
    .withMessage('limit must be an integer between 1 and 200')
];
