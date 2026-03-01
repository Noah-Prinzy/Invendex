import { body, param } from 'express-validator';

const withNormalizedString = (value) => String(value || '').trim();

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

export const loginValidator = [
  requireEmail,
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
];

export const employeeLoginValidator = [
  requireEmail,
  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required'),
  body('companyName').custom((value, { req }) => {
    const companyName = withNormalizedString(
      req.body?.companyName || req.body?.organizationName
    );
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

const optionalTwoFactorCode = body('code')
  .optional({ nullable: true })
  .isString()
  .withMessage('code must be a string')
  .bail()
  .trim()
  .isLength({ min: 6, max: 8 })
  .withMessage('code must be between 6 and 8 characters')
  .bail()
  .matches(/^\d+$/)
  .withMessage('code must contain only digits');

const optionalRecoveryCode = body('recoveryCode')
  .optional({ nullable: true })
  .isString()
  .withMessage('recoveryCode must be a string')
  .bail()
  .trim()
  .isLength({ min: 4, max: 40 })
  .withMessage('recoveryCode must be between 4 and 40 characters');

const requireOneTwoFactorProof = body().custom((value, { req }) => {
  const code = withNormalizedString(req.body?.code);
  const recoveryCode = withNormalizedString(req.body?.recoveryCode);
  if (!code && !recoveryCode) {
    throw new Error('Either code or recoveryCode is required');
  }
  return true;
});

export const twoFactorVerifyLoginValidator = [
  body('twoFactorToken')
    .exists({ checkFalsy: true })
    .withMessage('twoFactorToken is required')
    .bail()
    .isString()
    .withMessage('twoFactorToken must be a string'),
  optionalTwoFactorCode,
  optionalRecoveryCode,
  requireOneTwoFactorProof
];

export const twoFactorSetupValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('currentPassword is required')
    .bail()
    .isString()
    .withMessage('currentPassword must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('currentPassword must be at least 8 characters long')
];

export const twoFactorEnableValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('currentPassword is required')
    .bail()
    .isString()
    .withMessage('currentPassword must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('currentPassword must be at least 8 characters long'),
  body('code')
    .exists({ checkFalsy: true })
    .withMessage('code is required')
    .bail()
    .isString()
    .withMessage('code must be a string')
    .bail()
    .trim()
    .isLength({ min: 6, max: 8 })
    .withMessage('code must be between 6 and 8 characters')
    .bail()
    .matches(/^\d+$/)
    .withMessage('code must contain only digits')
];

export const twoFactorDisableValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('currentPassword is required')
    .bail()
    .isString()
    .withMessage('currentPassword must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('currentPassword must be at least 8 characters long'),
  optionalTwoFactorCode,
  optionalRecoveryCode,
  requireOneTwoFactorProof
];

export const twoFactorRegenerateRecoveryCodesValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('currentPassword is required')
    .bail()
    .isString()
    .withMessage('currentPassword must be a string')
    .bail()
    .isLength({ min: 8 })
    .withMessage('currentPassword must be at least 8 characters long'),
  optionalTwoFactorCode,
  optionalRecoveryCode,
  requireOneTwoFactorProof
];

const allowedUiThemes = [
  'ledgerly-classic',
  'glacier-blue',
  'emerald-shift',
  'graphite-noir',
  'sunset-ember',
  'royal-violet',
  'sand-dune',
  'neon-grid'
];

export const updateMePreferencesValidator = [
  body('uiTheme')
    .exists({ checkFalsy: true })
    .withMessage('uiTheme is required')
    .bail()
    .isString()
    .withMessage('uiTheme must be a string')
    .bail()
    .isIn(allowedUiThemes)
    .withMessage(`uiTheme must be one of: ${allowedUiThemes.join(', ')}`)
];

export const sessionIdParamValidator = [
  param('sessionId')
    .exists({ checkFalsy: true })
    .withMessage('sessionId is required')
    .bail()
    .isString()
    .withMessage('sessionId must be a string')
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage('sessionId must be between 8 and 128 characters')
];

export default {
  registerValidator,
  loginValidator,
  employeeLoginValidator,
  requestEmailVerificationValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  updateMePreferencesValidator,
  sessionIdParamValidator,
  twoFactorVerifyLoginValidator,
  twoFactorSetupValidator,
  twoFactorEnableValidator,
  twoFactorDisableValidator,
  twoFactorRegenerateRecoveryCodesValidator
};
