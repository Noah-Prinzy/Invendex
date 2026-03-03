import { body } from 'express-validator';

export const seedSampleDataValidator = [
  body('force').optional().isBoolean().withMessage('force must be a boolean')
];

export const createOnboardingWarehouseValidator = [
  body('name')
    .exists()
    .withMessage('name is required')
    .bail()
    .isString()
    .withMessage('name must be a string')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('name must be between 2 and 120 characters'),
  body('code')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('code must be a string')
    .trim()
    .isLength({ min: 2, max: 24 })
    .withMessage('code must be between 2 and 24 characters'),
  body('region')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('region must be a string')
    .trim()
    .isLength({ max: 120 })
    .withMessage('region must be at most 120 characters'),
  body('managerUserId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('managerUserId must be a valid Mongo ID'),
  body('address')
    .optional({ values: 'falsy' })
    .isObject()
    .withMessage('address must be an object'),
  body('address.street')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('address.street must be a string')
    .trim()
    .isLength({ max: 160 })
    .withMessage('address.street must be at most 160 characters'),
  body('address.city')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('address.city must be a string')
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.city must be at most 120 characters'),
  body('address.state')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('address.state must be a string')
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.state must be at most 120 characters'),
  body('address.country')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('address.country must be a string')
    .trim()
    .isLength({ max: 120 })
    .withMessage('address.country must be at most 120 characters'),
  body('address.postalCode')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('address.postalCode must be a string')
    .trim()
    .isLength({ max: 30 })
    .withMessage('address.postalCode must be at most 30 characters')
];

export default {
  seedSampleDataValidator,
  createOnboardingWarehouseValidator
};
