import mongoose from 'mongoose';
import { body, param } from 'express-validator';

import Product from '../models/Product.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

export const createPurchaseOrderValidator = [
  body('supplier')
    .notEmpty()
    .withMessage('Supplier is required')
    .bail()
    .isMongoId()
    .withMessage('Supplier must be a valid ID')
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

  body('warehouse')
    .notEmpty()
    .withMessage('Warehouse is required')
    .bail()
    .isMongoId()
    .withMessage('Warehouse must be a valid ID')
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

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one purchase order item is required')
    .bail()
    .custom(async (items, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const productIds = [
        ...new Set(
          items
            .map((item) => item?.product)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
        )
      ];

      // Let field-level validators report malformed IDs.
      if (productIds.length === 0) {
        return true;
      }

      const productCount = await Product.countDocuments({
        _id: { $in: productIds },
        organization: organizationId
      });

      if (productCount !== productIds.length) {
        throw new Error(
          'One or more products were not found in your organization'
        );
      }
      return true;
    }),

  body('items.*.product')
    .notEmpty()
    .withMessage('Each item must include a product')
    .bail()
    .isMongoId()
    .withMessage('Each item product must be a valid ID'),

  body('items.*.sku')
    .trim()
    .notEmpty()
    .withMessage('Each item must include a sku'),

  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item quantity must be an integer of at least 1'),

  body('items.*.unitCost')
    .isFloat({ min: 0 })
    .withMessage('Each item unitCost must be a non-negative number'),

  body('items.*.trackingType')
    .optional({ values: 'falsy' })
    .isIn(['NONE', 'BATCH', 'SERIAL'])
    .withMessage('trackingType must be NONE, BATCH, or SERIAL'),

  body('items.*.lotNumber')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('lotNumber must be a string'),

  body('items.*.expiryDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expiryDate must be a valid date'),

  body('items.*.serialNumbers')
    .optional()
    .isArray()
    .withMessage('serialNumbers must be an array'),

  body('items').custom((items) => {
    if (!Array.isArray(items)) {
      return true;
    }

    for (const item of items) {
      const trackingType = String(item?.trackingType || 'NONE')
        .trim()
        .toUpperCase();

      if (trackingType === 'BATCH' && !item?.lotNumber) {
        throw new Error('lotNumber is required for BATCH tracked items');
      }

      if (trackingType === 'SERIAL') {
        if (!Array.isArray(item?.serialNumbers) || !item.serialNumbers.length) {
          throw new Error(
            'serialNumbers are required for SERIAL tracked items'
          );
        }

        if (item.serialNumbers.length !== Number(item.quantity)) {
          throw new Error(
            'serialNumbers count must equal quantity for SERIAL tracked items'
          );
        }

        const normalizedSerials = item.serialNumbers
          .map((serial) =>
            String(serial || '')
              .trim()
              .toUpperCase()
          )
          .filter(Boolean);

        if (normalizedSerials.length !== item.serialNumbers.length) {
          throw new Error('serialNumbers cannot contain blank values');
        }

        if (new Set(normalizedSerials).size !== normalizedSerials.length) {
          throw new Error('serialNumbers must be unique per line item');
        }
      }
    }

    return true;
  }),

  body('expectedDeliveryDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('expectedDeliveryDate must be a valid date'),

  body('notes')
    .optional()
    .isString()
    .withMessage('notes must be a string')
    .bail()
    .isLength({ max: 2000 })
    .withMessage('notes is too long')
];

export const purchaseOrderIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid purchase order ID')
    .bail()
    .custom(async (purchaseOrderId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await PurchaseOrder.exists({
        _id: purchaseOrderId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Purchase order not found');
      }
      return true;
    })
];

export const generatePurchaseOrdersFromAlertsValidator = [
  body('warehouse')
    .notEmpty()
    .withMessage('Warehouse is required')
    .bail()
    .isMongoId()
    .withMessage('Warehouse must be a valid ID')
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
