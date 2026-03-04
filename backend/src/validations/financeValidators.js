import { body, query } from 'express-validator';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';

const VALUATION_METHODS = ['FIFO', 'LIFO', 'WEIGHTED_AVG'];
const GROSS_MARGIN_GROUP_BY = ['day', 'product', 'category'];

const ensureOrganizationContext = (req) => {
  if (!req.organizationId) {
    throw new Error('Organization context is required');
  }
  return req.organizationId;
};

const optionalIsoDateValidator = (fieldName) =>
  query(fieldName)
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage(`${fieldName} must be a valid ISO date`);

const optionalCurrencyCodeQueryValidator = (fieldName = 'currencyCode') =>
  query(fieldName)
    .optional({ values: 'falsy' })
    .isString()
    .withMessage(`${fieldName} must be a string`)
    .bail()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage(`${fieldName} must be exactly 3 characters`)
    .toUpperCase();

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
    .withMessage('method must be FIFO, LIFO, or WEIGHTED_AVG'),
  optionalCurrencyCodeQueryValidator('currencyCode')
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
    }),
  optionalCurrencyCodeQueryValidator('currencyCode')
];

export const grossMarginQueryValidator = [
  optionalIsoDateValidator('from'),
  optionalIsoDateValidator('to'),
  optionalDateRangeValidator,
  query('groupBy')
    .optional({ values: 'falsy' })
    .isIn(GROSS_MARGIN_GROUP_BY)
    .withMessage('groupBy must be day, product, or category'),
  optionalCurrencyCodeQueryValidator('currencyCode')
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
    }),
  optionalCurrencyCodeQueryValidator('currencyCode')
];

export const patchTaxConfigurationValidator = [
  body('vatEnabled')
    .optional()
    .isBoolean()
    .withMessage('vatEnabled must be a boolean')
    .toBoolean(),
  body('vatRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('vatRate must be between 0 and 100')
    .toFloat(),
  body('importTaxEnabled')
    .optional()
    .isBoolean()
    .withMessage('importTaxEnabled must be a boolean')
    .toBoolean(),
  body('importTaxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('importTaxRate must be between 0 and 100')
    .toFloat(),
  body('taxInclusivePricing')
    .optional()
    .isBoolean()
    .withMessage('taxInclusivePricing must be a boolean')
    .toBoolean(),
  body('countryCode')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('countryCode must be a string')
    .bail()
    .isLength({ min: 2, max: 3 })
    .withMessage('countryCode must be 2-3 characters')
    .trim()
    .toUpperCase(),
  body('currencyCode')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('currencyCode must be a string')
    .bail()
    .isLength({ min: 3, max: 3 })
    .withMessage('currencyCode must be exactly 3 characters')
    .trim()
    .toUpperCase(),
  body('taxAuthorityName')
    .optional()
    .isString()
    .withMessage('taxAuthorityName must be a string')
    .bail()
    .trim()
    .isLength({ max: 120 })
    .withMessage('taxAuthorityName must not exceed 120 characters'),
  body('taxRegistrationNumber')
    .optional()
    .isString()
    .withMessage('taxRegistrationNumber must be a string')
    .bail()
    .trim()
    .isLength({ max: 64 })
    .withMessage('taxRegistrationNumber must not exceed 64 characters'),
  body('regime')
    .optional()
    .isIn(['STANDARD_VAT', 'SIMPLIFIED', 'ZERO_RATED', 'EXEMPT'])
    .withMessage(
      'regime must be one of STANDARD_VAT, SIMPLIFIED, ZERO_RATED, EXEMPT'
    ),
  body('defaultTaxCategory')
    .optional()
    .isIn(['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT'])
    .withMessage(
      'defaultTaxCategory must be one of STANDARD, REDUCED, ZERO, EXEMPT'
    )
];

export const vatSummaryQueryValidator = [
  optionalIsoDateValidator('from'),
  optionalIsoDateValidator('to'),
  optionalDateRangeValidator
];

export const patchNotificationSettingsValidator = [
  body('smsLowStockEnabled')
    .optional()
    .isBoolean()
    .withMessage('smsLowStockEnabled must be a boolean')
    .toBoolean(),
  body('whatsappLowStockEnabled')
    .optional()
    .isBoolean()
    .withMessage('whatsappLowStockEnabled must be a boolean')
    .toBoolean(),
  body('smsLowStockRecipients')
    .optional()
    .isArray({ max: 20 })
    .withMessage('smsLowStockRecipients must be an array with up to 20 items'),
  body('smsLowStockRecipients.*')
    .optional()
    .isString()
    .withMessage('Each SMS recipient must be a string')
    .bail()
    .isLength({ min: 7, max: 24 })
    .withMessage('Each SMS recipient must be between 7 and 24 characters'),
  body('whatsappLowStockRecipients')
    .optional()
    .isArray({ max: 20 })
    .withMessage(
      'whatsappLowStockRecipients must be an array with up to 20 items'
    ),
  body('whatsappLowStockRecipients.*')
    .optional()
    .isString()
    .withMessage('Each WhatsApp recipient must be a string')
    .bail()
    .isLength({ min: 7, max: 24 })
    .withMessage('Each WhatsApp recipient must be between 7 and 24 characters')
];

export const exchangeRatesQueryValidator = [
  optionalCurrencyCodeQueryValidator('baseCurrencyCode')
];

export const putExchangeRatesValidator = [
  body('baseCurrencyCode')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('baseCurrencyCode must be a string')
    .bail()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('baseCurrencyCode must be exactly 3 characters')
    .toUpperCase(),
  body('rates')
    .exists()
    .withMessage('rates is required')
    .bail()
    .isArray({ min: 1, max: 100 })
    .withMessage('rates must be an array between 1 and 100 items'),
  body('rates.*.quoteCurrencyCode')
    .exists({ checkFalsy: true })
    .withMessage('rates[].quoteCurrencyCode is required')
    .bail()
    .isString()
    .withMessage('rates[].quoteCurrencyCode must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('rates[].quoteCurrencyCode must be exactly 3 characters')
    .toUpperCase(),
  body('rates.*.rate')
    .exists()
    .withMessage('rates[].rate is required')
    .bail()
    .isFloat({ min: 0.000001 })
    .withMessage('rates[].rate must be greater than 0')
    .toFloat(),
  body('rates.*.source')
    .optional({ values: 'falsy' })
    .isIn(['MANUAL', 'SYSTEM'])
    .withMessage('rates[].source must be MANUAL or SYSTEM')
];

export const convertCurrencyValidator = [
  body('amount')
    .exists()
    .withMessage('amount is required')
    .bail()
    .isFloat()
    .withMessage('amount must be a valid number')
    .toFloat(),
  body('fromCurrencyCode')
    .exists({ checkFalsy: true })
    .withMessage('fromCurrencyCode is required')
    .bail()
    .isString()
    .withMessage('fromCurrencyCode must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('fromCurrencyCode must be exactly 3 characters')
    .toUpperCase(),
  body('toCurrencyCode')
    .exists({ checkFalsy: true })
    .withMessage('toCurrencyCode is required')
    .bail()
    .isString()
    .withMessage('toCurrencyCode must be a string')
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('toCurrencyCode must be exactly 3 characters')
    .toUpperCase()
];
