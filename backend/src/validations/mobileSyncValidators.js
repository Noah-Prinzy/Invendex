import { body, query } from 'express-validator';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const mobileSyncBootstrapQueryValidator = [
  query('since')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('since must be a valid ISO date'),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be an integer between 1 and 500')
    .toInt(),
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
    })
];

export const mobileSyncMutationsValidator = [
  body('deviceId')
    .exists({ checkFalsy: true })
    .withMessage('deviceId is required')
    .bail()
    .isString()
    .withMessage('deviceId must be a string')
    .bail()
    .isLength({ min: 3, max: 120 })
    .withMessage('deviceId must be between 3 and 120 characters'),
  body('mutations')
    .isArray({ min: 1, max: 200 })
    .withMessage('mutations must be an array between 1 and 200 entries'),
  body('mutations.*.mutationId')
    .exists({ checkFalsy: true })
    .withMessage('mutationId is required for each mutation')
    .bail()
    .isString()
    .withMessage('mutationId must be a string')
    .bail()
    .isLength({ min: 3, max: 120 })
    .withMessage('mutationId must be between 3 and 120 characters'),
  body('mutations.*.type')
    .exists({ checkFalsy: true })
    .withMessage('type is required for each mutation')
    .bail()
    .isIn(['inventory.adjust'])
    .withMessage('Unsupported mutation type'),
  body('mutations').custom(async (mutations, { req }) => {
    const organizationId = ensureOrganizationContext(req);

    for (const mutation of mutations) {
      if (String(mutation?.type || '').trim() !== 'inventory.adjust') {
        continue;
      }

      const payload = mutation?.payload || {};
      const productId = String(payload.productId || '').trim();
      const warehouseId = String(payload.warehouseId || '').trim();
      const amount = Number(payload.amount);
      const reason = String(payload.reason || '')
        .trim()
        .toLowerCase();

      if (!productId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error('inventory.adjust payload.productId must be valid');
      }
      if (!warehouseId.match(/^[a-fA-F0-9]{24}$/)) {
        throw new Error('inventory.adjust payload.warehouseId must be valid');
      }
      if (!Number.isInteger(amount) || amount === 0) {
        throw new Error(
          'inventory.adjust payload.amount must be a non-zero integer'
        );
      }
      if (!['sale', 'restock', 'adjustment', 'return'].includes(reason)) {
        throw new Error(
          'inventory.adjust payload.reason must be sale|restock|adjustment|return'
        );
      }

      const [productExists, warehouseExists] = await Promise.all([
        Product.exists({
          _id: productId,
          organization: organizationId
        }),
        Warehouse.exists({
          _id: warehouseId,
          organization: organizationId
        })
      ]);

      if (!productExists) {
        throw new Error(
          `inventory.adjust product not found: ${payload.productId}`
        );
      }
      if (!warehouseExists) {
        throw new Error(
          `inventory.adjust warehouse not found: ${payload.warehouseId}`
        );
      }
    }

    return true;
  })
];

export default {
  mobileSyncBootstrapQueryValidator,
  mobileSyncMutationsValidator
};
