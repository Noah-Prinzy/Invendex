import { body, param } from 'express-validator';

import Supplier from '../models/Supplier.js';

const ensureOrganizationContext = req => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

const supplierNameRules = body('name')
  .trim()
  .notEmpty()
  .withMessage('Supplier name is required')
  .bail()
  .isLength({ max: 200 })
  .withMessage('Supplier name is too long');

const optionalSupplierFieldRules = [
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Supplier email must be valid')
    .bail()
    .normalizeEmail(),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Supplier phone is too long'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('notes')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('notes must be a string')
    .bail()
    .isLength({ max: 2000 })
    .withMessage('notes is too long')
];

export const supplierIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid supplier ID')
    .bail()
    .custom(async (supplierId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Supplier.exists({
        _id: supplierId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Supplier not found');
      }
      return true;
    })
];

export const supplierPerformanceParamValidator = [
  param('supplierId')
    .isMongoId()
    .withMessage('Invalid supplier ID')
    .bail()
    .custom(async (supplierId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Supplier.exists({
        _id: supplierId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Supplier not found');
      }
      return true;
    })
];

export const createSupplierValidator = [
  supplierNameRules,
  body('name').custom(async (name, { req }) => {
    const organizationId = ensureOrganizationContext(req);
    const exists = await Supplier.exists({
      name: name.trim(),
      organization: organizationId
    });
    if (exists) {
      throw new Error('Supplier with this name already exists');
    }
    return true;
  }),
  ...optionalSupplierFieldRules
];

export const updateSupplierValidator = [
  ...supplierIdParamValidator,
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Supplier name cannot be empty')
    .bail()
    .isLength({ max: 200 })
    .withMessage('Supplier name is too long')
    .bail()
    .custom(async (name, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await Supplier.exists({
        _id: { $ne: req.params.id },
        name: name.trim(),
        organization: organizationId
      });
      if (exists) {
        throw new Error('Supplier with this name already exists');
      }
      return true;
    }),
  ...optionalSupplierFieldRules
];
