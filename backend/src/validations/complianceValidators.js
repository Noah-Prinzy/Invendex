import { body, query } from 'express-validator';

export const exportOrganizationDataValidator = [
  query('includeAudit')
    .optional()
    .isBoolean()
    .withMessage('includeAudit must be a boolean')
    .toBoolean(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage('limit must be an integer between 1 and 5000')
    .toInt()
];

const currentPasswordValidator = body('currentPassword')
  .exists({ checkFalsy: true })
  .withMessage('currentPassword is required')
  .bail()
  .isString()
  .withMessage('currentPassword must be a string')
  .bail()
  .isLength({ min: 8 })
  .withMessage('currentPassword must be at least 8 characters long');

export const deleteMyAccountValidator = [
  currentPasswordValidator,
  body('confirmationText')
    .exists({ checkFalsy: true })
    .withMessage('confirmationText is required')
    .bail()
    .isString()
    .withMessage('confirmationText must be a string')
    .bail()
    .trim()
    .isLength({ min: 6, max: 120 })
    .withMessage('confirmationText must be between 6 and 120 characters')
];

export const deleteOrganizationValidator = [
  currentPasswordValidator,
  body('confirmationText')
    .exists({ checkFalsy: true })
    .withMessage('confirmationText is required')
    .bail()
    .isString()
    .withMessage('confirmationText must be a string')
    .bail()
    .trim()
    .isLength({ min: 6, max: 120 })
    .withMessage('confirmationText must be between 6 and 120 characters')
];

export default {
  exportOrganizationDataValidator,
  deleteMyAccountValidator,
  deleteOrganizationValidator
};
