import { body } from 'express-validator';

const SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'];

export const patchSubscriptionValidator = [
  body('planCode')
    .exists({ checkFalsy: true })
    .withMessage('planCode is required')
    .bail()
    .isString()
    .withMessage('planCode must be a string')
    .bail()
    .trim()
    .isLength({ min: 2, max: 32 })
    .withMessage('planCode must be between 2 and 32 characters')
    .toUpperCase(),
  body('status')
    .optional()
    .isString()
    .withMessage('status must be a string')
    .bail()
    .trim()
    .toUpperCase()
    .isIn(SUBSCRIPTION_STATUSES)
    .withMessage(`status must be one of ${SUBSCRIPTION_STATUSES.join(', ')}`)
];

export default {
  patchSubscriptionValidator
};
