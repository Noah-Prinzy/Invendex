import { body } from 'express-validator';

const withNormalizedString = value => String(value || '').trim();

const requireEmail = body('email')
  .exists({ checkFalsy: true })
  .withMessage('Email is required')
  .bail()
  .isEmail()
  .withMessage('Email must be a valid email address')
  .bail()
  .normalizeEmail();

const requirePassword = body('password')
  .exists({ checkFalsy: true })
  .withMessage('Password is required')
  .bail()
  .isString()
  .withMessage('Password must be a string')
  .bail()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long');

const requireToken = body('token')
  .exists({ checkFalsy: true })
  .withMessage('Token is required')
  .bail()
  .isString()
  .withMessage('Token must be a string');

export const registerValidator = [
  requireEmail,
  requirePassword,
  body('confirmPassword')
    .exists({ checkFalsy: true })
    .withMessage('confirmPassword is required')
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password and confirmPassword do not match'),
  body('organizationName').custom((value, { req }) => {
    const organizationName = withNormalizedString(
      req.body?.organizationName || req.body?.companyName
    );

    if (!organizationName) {
      throw new Error('organizationName is required');
    }

    if (organizationName.length > 120) {
      throw new Error('organizationName must be at most 120 characters');
    }

    return true;
  })
];

export const loginValidator = [requireEmail, body('password').exists({ checkFalsy: true }).withMessage('Password is required')];

export const employeeLoginValidator = [
  requireEmail,
  body('password').exists({ checkFalsy: true }).withMessage('Password is required'),
  body('companyName').custom((value, { req }) => {
    const companyName = withNormalizedString(req.body?.companyName || req.body?.organizationName);
    if (!companyName) {
      throw new Error('companyName is required');
    }

    if (companyName.length > 120) {
      throw new Error('companyName must be at most 120 characters');
    }

    return true;
  }),
  body('inviteCode')
    .optional({ nullable: true })
    .isString()
    .withMessage('inviteCode must be a string')
    .bail()
    .isLength({ max: 128 })
    .withMessage('inviteCode must be at most 128 characters')
];

export const requestEmailVerificationValidator = [requireEmail];

export const verifyEmailValidator = [requireEmail, requireToken];

export const forgotPasswordValidator = [requireEmail];

export const resetPasswordValidator = [
  requireEmail,
  requireToken,
  requirePassword,
  body('confirmPassword')
    .exists({ checkFalsy: true })
    .withMessage('confirmPassword is required')
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Password and confirmPassword do not match')
];

export default {
  registerValidator,
  loginValidator,
  employeeLoginValidator,
  requestEmailVerificationValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};
