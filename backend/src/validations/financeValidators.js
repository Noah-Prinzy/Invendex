import { body, query } from 'express-validator';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';

const VALUATION_METHODS = ['FIFO', 'LIFO', 'WEIGHTED_AVG'];
const GROSS_MARGIN_GROUP_BY = ['day', 'product', 'category'];

const ensureOrganizationContext = req => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

const optionalIsoDateValidator = fieldName =>
  query(fieldName)
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage(`${fieldName} must be a valid ISO date`);

const optionalDateRangeValidator = query('to').custom((to, { req }) => {
  if (!to || !req.query?.from) return true;

  const fromDate = new Date(req.query.from);
  const toDate = new Date(to);
  if (fromDate > toDate) {
    throw new Error('from must be less than or equal to to');
  }

  return true;
});

export const financeValuationQueryValidator = [
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
  query('method')
    .optional({ values: 'falsy' })
    .isIn(VALUATION_METHODS)
    .withMessage('method must be FIFO, LIFO, or WEIGHTED_AVG')
];

export const patchValuationMethodValidator = [
  body('defaultMethod')
    .exists({ checkFalsy: true })
    .withMessage('defaultMethod is required')
    .bail()
    .isIn(VALUATION_METHODS)
    .withMessage('defaultMethod must be FIFO, LIFO, or WEIGHTED_AVG'),
  body('allowMethodOverride')
    .optional()
    .isBoolean()
    .withMessage('allowMethodOverride must be a boolean')
    .toBoolean()
];

export const cogsQueryValidator = [
  optionalIsoDateValidator('from'),
  optionalIsoDateValidator('to'),
  optionalDateRangeValidator,
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
    })
];

export const grossMarginQueryValidator = [
  optionalIsoDateValidator('from'),
  optionalIsoDateValidator('to'),
  optionalDateRangeValidator,
  query('groupBy')
    .optional({ values: 'falsy' })
    .isIn(GROSS_MARGIN_GROUP_BY)
    .withMessage('groupBy must be day, product, or category')
];

export const deadStockQueryValidator = [
  query('days')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 3650 })
    .withMessage('days must be an integer between 1 and 3650')
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
