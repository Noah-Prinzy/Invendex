import { body, param } from 'express-validator';

export const updateUserStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('User ID must be a valid Mongo ID'),
  body('isActive')
    .exists()
    .withMessage('isActive is required')
    .bail()
    .isBoolean()
    .withMessage('isActive must be a boolean')
    .toBoolean()
];

export const createInviteValidator = [
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invite email must be a valid email')
    .normalizeEmail(),
  body('expiresInHours')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 24 * 30 })
    .withMessage('expiresInHours must be an integer between 1 and 720')
    .toInt()
];

export const inviteIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invite ID must be a valid Mongo ID')
];

