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
