import mongoose from 'mongoose';
import { body, param } from 'express-validator';

import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import SupplierProduct from '../models/SupplierProduct.js';

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const supplierProductIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid supplier-product link ID')
    .bail()
    .custom(async (linkId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await SupplierProduct.exists({
        _id: linkId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Supplier-product link not found');
      }
      return true;
    })
];

export const supplierProductProductParamValidator = [
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

export const createSupplierProductValidator = [
  body('supplier')
    .notEmpty()
    .withMessage('supplier is required')
    .bail()
    .isMongoId()
    .withMessage('supplier must be a valid ID')
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
    }),

  body('product')
    .notEmpty()
    .withMessage('product is required')
    .bail()
    .isMongoId()
    .withMessage('product must be a valid ID')
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

  body('sku')
    .trim()
    .notEmpty()
    .withMessage('sku is required')
    .bail()
    .isLength({ max: 100 })
    .withMessage('sku is too long'),

  body('unitCost')
    .isFloat({ min: 0 })
    .withMessage('unitCost must be a non-negative number'),

  body('leadTimeDays')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('leadTimeDays must be a non-negative integer'),

  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minimumOrderQuantity must be at least 1'),

  body('isPreferred')
    .optional()
    .isBoolean()
    .withMessage('isPreferred must be a boolean'),

  body().custom(async (_, { req }) => {
    const organizationId = ensureOrganizationContext(req);
    const { supplier, product } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(supplier) ||
      !mongoose.Types.ObjectId.isValid(product)
    ) {
      return true;
    }

    const exists = await SupplierProduct.exists({
      organization: organizationId,
      supplier,
      product
    });

    if (exists) {
      throw new Error('Supplier is already linked to this product');
    }

    return true;
  })
];

export const updateSupplierProductValidator = [
  ...supplierProductIdParamValidator,

  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('supplier must be a valid ID')
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
    }),

  body('product')
    .optional()
    .isMongoId()
    .withMessage('product must be a valid ID')
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

  body('sku')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('sku cannot be empty')
    .bail()
    .isLength({ max: 100 })
    .withMessage('sku is too long'),

  body('unitCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('unitCost must be a non-negative number'),

  body('leadTimeDays')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('leadTimeDays must be a non-negative integer'),

  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('minimumOrderQuantity must be at least 1'),

  body('isPreferred')
    .optional()
    .isBoolean()
    .withMessage('isPreferred must be a boolean'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];
