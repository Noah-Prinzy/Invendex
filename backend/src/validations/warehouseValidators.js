import mongoose from 'mongoose';
import { body, param, query } from 'express-validator';
import Warehouse from '../models/Warehouse.js';
import User from '../models/User.js';

const normalizeWarehouseCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

const managerUserIdValidator = body('managerUserId')
  .optional({ nullable: true })
  .custom(async (managerUserId, { req }) => {
    if (managerUserId === null || String(managerUserId || '').trim() === '') {
      return true;
    }

    if (!mongoose.Types.ObjectId.isValid(String(managerUserId || '').trim())) {
      throw new Error('managerUserId must be a valid user ID');
    }

    const organizationId = ensureOrganizationContext(req);
    const manager = await User.findOne({
      _id: String(managerUserId || '').trim(),
      organization: organizationId,
      isActive: { $ne: false }
    })
      .select('_id')
      .lean();

    if (!manager) {
      throw new Error('managerUserId is not a valid active user');
    }

    return true;
  });

const addressValidators = [
  body('address')
    .optional({ nullable: true })
    .isObject()
    .withMessage('address must be an object'),
  body('address.street')
    .optional({ nullable: true })
    .isString()
    .withMessage('address.street must be a string')
    .bail()
    .trim()
    .isLength({ max: 200 })
    .withMessage('address.street is too long'),
  body('address.city')
    .optional({ nullable: true })
    .isString()
    .withMessage('address.city must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.city is too long'),
  body('address.state')
    .optional({ nullable: true })
    .isString()
    .withMessage('address.state must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.state is too long'),
  body('address.country')
    .optional({ nullable: true })
    .isString()
    .withMessage('address.country must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.country is too long'),
  body('address.postalCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('address.postalCode must be a string')
    .bail()
    .trim()
    .isLength({ max: 40 })
    .withMessage('address.postalCode is too long')
];

export const listWarehousesQueryValidator = [
  query('includeInactive')
    .optional()
    .isBoolean()
    .withMessage('includeInactive must be a boolean')
    .toBoolean(),
  query('includeArchived')
    .optional()
    .isBoolean()
    .withMessage('includeArchived must be a boolean')
    .toBoolean()
];

export const warehouseIdParamValidator = [
  param('warehouseId')
    .isMongoId()
    .withMessage('Invalid warehouse ID')
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

export const createWarehouseValidator = [
  body('name')
    .isString()
    .withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('name must be between 2 and 120 characters'),
  body('code')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('code must be a string')
    .bail()
    .customSanitizer((value) => normalizeWarehouseCode(value))
    .isLength({ min: 2, max: 24 })
    .withMessage('code must be between 2 and 24 characters')
    .bail()
    .custom(async (code, { req }) => {
      if (!code) return true;

      const organizationId = ensureOrganizationContext(req);
      const exists = await Warehouse.exists({
        organization: organizationId,
        code
      });

      if (exists) {
        throw new Error('Warehouse code already exists in this organization');
      }

      return true;
    }),
  body('region')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('region must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('region is too long'),
  managerUserIdValidator,
  ...addressValidators
];

export const updateWarehouseValidator = [
  ...warehouseIdParamValidator,
  body('name')
    .optional()
    .isString()
    .withMessage('name must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('name must be between 2 and 120 characters'),
  body('code')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('code must be a string')
    .bail()
    .customSanitizer((value) => normalizeWarehouseCode(value))
    .isLength({ min: 2, max: 24 })
    .withMessage('code must be between 2 and 24 characters')
    .bail()
    .custom(async (code, { req }) => {
      if (!code) return true;

      const organizationId = ensureOrganizationContext(req);
      const exists = await Warehouse.exists({
        _id: { $ne: req.params.warehouseId },
        organization: organizationId,
        code
      });

      if (exists) {
        throw new Error('Warehouse code already exists in this organization');
      }

      return true;
    }),
  body('region')
    .optional({ nullable: true })
    .isString()
    .withMessage('region must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('region is too long'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean(),
  managerUserIdValidator,
  ...addressValidators
];

export const restoreWarehouseValidator = [
  ...warehouseIdParamValidator,
  body('activateOnRestore')
    .optional()
    .isBoolean()
    .withMessage('activateOnRestore must be a boolean')
    .toBoolean()
];

export default {
  listWarehousesQueryValidator,
  warehouseIdParamValidator,
  createWarehouseValidator,
  updateWarehouseValidator,
  restoreWarehouseValidator
};
