import { body, param, query } from 'express-validator';
import PickTicket from '../models/PickTicket.js';
import Product from '../models/Product.js';
import Warehouse from '../models/Warehouse.js';
import WarehouseBin from '../models/WarehouseBin.js';

const BIN_TYPES = ['STORAGE', 'PICK_FACE', 'STAGING', 'QUARANTINE'];
const STOCK_MOVEMENT_TYPES = [
  'INBOUND',
  'OUTBOUND',
  'TRANSFER',
  'ALLOCATION',
  'PICK',
  'ADJUSTMENT'
];

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

const warehouseExistsValidator = (fieldName) =>
  body(fieldName)
    .exists({ checkFalsy: true })
    .withMessage(`${fieldName} is required`)
    .bail()
    .isMongoId()
    .withMessage(`${fieldName} must be a valid ID`)
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
    });

const optionalWarehouseQueryValidator = (fieldName) =>
  query(fieldName)
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage(`${fieldName} must be a valid ID`)
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
    });

const optionalProductQueryValidator = (fieldName) =>
  query(fieldName)
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage(`${fieldName} must be a valid ID`)
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
    });

export const createBinValidator = [
  warehouseExistsValidator('warehouseId'),
  body('code')
    .exists({ checkFalsy: true })
    .withMessage('code is required')
    .bail()
    .isString()
    .withMessage('code must be a string')
    .bail()
    .isLength({ min: 1, max: 64 })
    .withMessage('code must be between 1 and 64 characters')
    .trim()
    .toUpperCase(),
  body('zone')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('zone must be a string')
    .bail()
    .isLength({ max: 64 })
    .withMessage('zone must be at most 64 characters'),
  body('aisle')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('aisle must be a string')
    .bail()
    .isLength({ max: 64 })
    .withMessage('aisle must be at most 64 characters'),
  body('rack')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('rack must be a string')
    .bail()
    .isLength({ max: 64 })
    .withMessage('rack must be at most 64 characters'),
  body('shelf')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('shelf must be a string')
    .bail()
    .isLength({ max: 64 })
    .withMessage('shelf must be at most 64 characters'),
  body('binType')
    .optional({ values: 'falsy' })
    .isIn(BIN_TYPES)
    .withMessage('binType must be STORAGE, PICK_FACE, STAGING, or QUARANTINE'),
  body('maxCapacityUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('maxCapacityUnits must be a non-negative integer')
    .toInt(),
  body('replenishmentMinUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('replenishmentMinUnits must be a non-negative integer')
    .toInt(),
  body('replenishmentTargetUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('replenishmentTargetUnits must be a non-negative integer')
    .toInt(),
  body().custom((_, { req }) => {
    const min = req.body?.replenishmentMinUnits;
    const target = req.body?.replenishmentTargetUnits;
    if (
      min !== undefined &&
      min !== null &&
      target !== undefined &&
      target !== null &&
      Number(target) < Number(min)
    ) {
      throw new Error(
        'replenishmentTargetUnits must be greater than or equal to replenishmentMinUnits'
      );
    }
    return true;
  })
];

export const listBinsQueryValidator = [
  optionalWarehouseQueryValidator('warehouseId'),
  query('includeInactive')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('includeInactive must be a boolean')
    .toBoolean()
];

export const updateBinRulesValidator = [
  param('binId')
    .isMongoId()
    .withMessage('binId must be a valid ID')
    .bail()
    .custom(async (binId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await WarehouseBin.exists({
        _id: binId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Bin not found');
      }
      return true;
    }),
  warehouseExistsValidator('warehouseId'),
  body('maxCapacityUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('maxCapacityUnits must be a non-negative integer')
    .toInt(),
  body('replenishmentMinUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('replenishmentMinUnits must be a non-negative integer')
    .toInt(),
  body('replenishmentTargetUnits')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage('replenishmentTargetUnits must be a non-negative integer')
    .toInt(),
  body().custom((_, { req }) => {
    const hasAnyRuleField =
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        'maxCapacityUnits'
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        'replenishmentMinUnits'
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        'replenishmentTargetUnits'
      );

    if (!hasAnyRuleField) {
      throw new Error(
        'At least one rule field is required: maxCapacityUnits, replenishmentMinUnits, or replenishmentTargetUnits'
      );
    }

    const min = req.body?.replenishmentMinUnits;
    const target = req.body?.replenishmentTargetUnits;
    if (
      min !== undefined &&
      min !== null &&
      target !== undefined &&
      target !== null &&
      Number(target) < Number(min)
    ) {
      throw new Error(
        'replenishmentTargetUnits must be greater than or equal to replenishmentMinUnits'
      );
    }

    return true;
  })
];

export const allocateBinStockValidator = [
  warehouseExistsValidator('warehouseId'),
  body('binId')
    .exists({ checkFalsy: true })
    .withMessage('binId is required')
    .bail()
    .isMongoId()
    .withMessage('binId must be a valid ID')
    .bail()
    .custom(async (binId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await WarehouseBin.exists({
        _id: binId,
        organization: organizationId,
        warehouse: req.body?.warehouseId
      });
      if (!exists) {
        throw new Error('Bin not found in selected warehouse');
      }
      return true;
    }),
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
  body('quantity')
    .exists({ checkFalsy: true })
    .withMessage('quantity is required')
    .bail()
    .isInt({ min: 1, max: 1_000_000 })
    .withMessage('quantity must be a positive integer')
    .toInt(),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('reason must be a string')
    .bail()
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters')
];

export const transferBinStockValidator = [
  warehouseExistsValidator('warehouseId'),
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
  body('fromBinId')
    .exists({ checkFalsy: true })
    .withMessage('fromBinId is required')
    .bail()
    .isMongoId()
    .withMessage('fromBinId must be a valid ID'),
  body('toBinId')
    .exists({ checkFalsy: true })
    .withMessage('toBinId is required')
    .bail()
    .isMongoId()
    .withMessage('toBinId must be a valid ID'),
  body('quantity')
    .exists({ checkFalsy: true })
    .withMessage('quantity is required')
    .bail()
    .isInt({ min: 1, max: 1_000_000 })
    .withMessage('quantity must be a positive integer')
    .toInt(),
  body('reason')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('reason must be a string')
    .bail()
    .isLength({ max: 500 })
    .withMessage('reason must be at most 500 characters'),
  body().custom(async (_, { req }) => {
    const { fromBinId, toBinId, warehouseId } = req.body || {};
    if (String(fromBinId || '') === String(toBinId || '')) {
      throw new Error('fromBinId and toBinId must be different');
    }

    const organizationId = ensureOrganizationContext(req);
    const bins = await WarehouseBin.countDocuments({
      _id: { $in: [fromBinId, toBinId] },
      organization: organizationId,
      warehouse: warehouseId
    });
    if (bins !== 2) {
      throw new Error(
        'fromBinId and toBinId must exist in the selected warehouse'
      );
    }

    return true;
  })
];

export const createPickTicketValidator = [
  warehouseExistsValidator('warehouseId'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array')
    .bail()
    .custom(async (items, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const normalizedItems = Array.isArray(items) ? items : [];
      const productIds = new Set();

      for (const item of normalizedItems) {
        const productId = item?.productId || item?.product;
        if (!productId) {
          throw new Error('Each pick item must include productId or product');
        }

        const requestedQuantity = Number(
          item?.quantity ?? item?.requestedQuantity ?? 0
        );
        if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
          throw new Error('Each pick item quantity must be a positive integer');
        }

        if (!String(productId || '').match(/^[a-fA-F0-9]{24}$/)) {
          throw new Error('Each pick item productId must be a valid ID');
        }
        productIds.add(String(productId));

        if (Array.isArray(item?.serialNumbers) && item.serialNumbers.length) {
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
            throw new Error('serialNumbers must be unique per pick item');
          }
          if (normalizedSerials.length !== requestedQuantity) {
            throw new Error(
              'serialNumbers count must equal requested quantity for pick item'
            );
          }
        }
      }

      const productCount = await Product.countDocuments({
        _id: { $in: [...productIds] },
        organization: organizationId
      });
      if (productCount !== productIds.size) {
        throw new Error('One or more pick item products were not found');
      }

      return true;
    }),
  body('items.*.lotNumber')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('lotNumber must be a string')
    .bail()
    .isLength({ max: 120 })
    .withMessage('lotNumber must be at most 120 characters'),
  body('items.*.serialNumbers')
    .optional()
    .isArray()
    .withMessage('serialNumbers must be an array'),
  body('notes')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('notes must be a string')
    .bail()
    .isLength({ max: 2000 })
    .withMessage('notes must be at most 2000 characters')
];

export const pickTicketIdParamValidator = [
  param('ticketId')
    .isMongoId()
    .withMessage('ticketId must be a valid ID')
    .bail()
    .custom(async (ticketId, { req }) => {
      const organizationId = ensureOrganizationContext(req);
      const exists = await PickTicket.exists({
        _id: ticketId,
        organization: organizationId
      });
      if (!exists) {
        throw new Error('Pick ticket not found');
      }
      return true;
    })
];

export const movementLedgerQueryValidator = [
  optionalWarehouseQueryValidator('warehouseId'),
  optionalProductQueryValidator('productId'),
  query('type')
    .optional({ values: 'falsy' })
    .isIn(STOCK_MOVEMENT_TYPES)
    .withMessage(
      'type must be INBOUND, OUTBOUND, TRANSFER, ALLOCATION, PICK, or ADJUSTMENT'
    ),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be an integer between 1 and 500')
    .toInt()
];

export const replenishmentQueryValidator = [
  query('warehouseId')
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
      if (!exists) {
        throw new Error('Warehouse not found');
      }
      return true;
    })
];

export default {
  createBinValidator,
  listBinsQueryValidator,
  updateBinRulesValidator,
  allocateBinStockValidator,
  transferBinStockValidator,
  createPickTicketValidator,
  pickTicketIdParamValidator,
  movementLedgerQueryValidator,
  replenishmentQueryValidator
};
