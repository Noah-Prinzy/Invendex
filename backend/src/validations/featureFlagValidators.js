import { body, param } from 'express-validator';

const FEATURE_FLAG_KEY_REGEX = /^[a-z0-9._-]{2,64}$/;

export const featureFlagKeyParamValidator = [
  param('flagKey')
    .exists({ checkFalsy: true })
    .withMessage('flagKey is required')
    .bail()
    .isString()
    .withMessage('flagKey must be a string')
    .bail()
    .trim()
    .toLowerCase()
    .matches(FEATURE_FLAG_KEY_REGEX)
    .withMessage(
      'flagKey must contain only lowercase letters, numbers, dot, underscore, or hyphen'
    )
];

export const patchFeatureFlagValidator = [
  ...featureFlagKeyParamValidator,
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled must be a boolean')
    .toBoolean(),
  body('rolloutPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('rolloutPercentage must be between 0 and 100')
    .toFloat(),
  body('description')
    .optional()
    .isString()
    .withMessage('description must be a string')
    .bail()
    .trim()
    .isLength({ max: 240 })
    .withMessage('description must not exceed 240 characters'),
  body().custom((value) => {
    const payload = value || {};
    const hasAnyPatch =
      Object.prototype.hasOwnProperty.call(payload, 'enabled') ||
      Object.prototype.hasOwnProperty.call(payload, 'rolloutPercentage') ||
      Object.prototype.hasOwnProperty.call(payload, 'description');

    if (!hasAnyPatch) {
      throw new Error(
        'Provide at least one of enabled, rolloutPercentage, or description'
      );
    }

    return true;
  })
];

export default {
  featureFlagKeyParamValidator,
  patchFeatureFlagValidator
};
