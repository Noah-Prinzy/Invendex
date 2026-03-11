import express from 'express';
import {
  register,
  login,
  adminLogin,
  employeeLogin,
  requestEmployeeSignup,
  approveEmployeeSignupRequest,
  declineEmployeeSignupRequest,
  getMe,
  updateMePreferences,
  refreshToken,
  logout,
  getMySessions,
  revokeSession,
  logoutOtherSessions,
  requestEmailVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  regenerateTwoFactorRecoveryCodes,
  verifyTwoFactorLogin
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import requireOrganization from '../middlewares/requireOrganization.js';
import requireRoles from '../middlewares/requireRoles.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';
import validateRequest from '../middlewares/validateRequest.js';
import { issueCsrfToken, requireCsrf } from '../middlewares/csrfProtection.js';
import {
  registerValidator,
  loginValidator,
  adminLoginValidator,
  employeeLoginValidator,
  employeeSignupRequestValidator,
  employeeSignupRequestDecisionValidator,
  updateMePreferencesValidator,
  sessionIdParamValidator,
  requestEmailVerificationValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  twoFactorVerifyLoginValidator,
  twoFactorSetupValidator,
  twoFactorEnableValidator,
  twoFactorDisableValidator,
  twoFactorRegenerateRecoveryCodesValidator
} from '../validations/authValidator.js';

const router = express.Router();

router.get('/csrf-token', issueCsrfToken);
router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginLimiter, loginValidator, validateRequest, login);
router.post(
  '/admin/login',
  loginLimiter,
  adminLoginValidator,
  validateRequest,
  adminLogin
);
router.post(
  '/employee/login',
  loginLimiter,
  employeeLoginValidator,
  validateRequest,
  employeeLogin
);
router.post(
  '/employee/signup',
  loginLimiter,
  employeeSignupRequestValidator,
  validateRequest,
  requestEmployeeSignup
);
router.post(
  '/employee/signup-requests/:id/approve',
  protect,
  requireOrganization,
  requireRoles('owner', 'admin'),
  employeeSignupRequestDecisionValidator,
  validateRequest,
  approveEmployeeSignupRequest
);
router.post(
  '/employee/signup-requests/:id/decline',
  protect,
  requireOrganization,
  requireRoles('owner', 'admin'),
  employeeSignupRequestDecisionValidator,
  validateRequest,
  declineEmployeeSignupRequest
);
router.post(
  '/verify-email/request',
  requestEmailVerificationValidator,
  validateRequest,
  requestEmailVerification
);
router.post(
  '/verify-email',
  verifyEmailValidator,
  validateRequest,
  verifyEmail
);
router.post(
  '/forgot-password',
  forgotPasswordValidator,
  validateRequest,
  forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordValidator,
  validateRequest,
  resetPassword
);
router.post(
  '/2fa/verify-login',
  twoFactorVerifyLoginValidator,
  validateRequest,
  verifyTwoFactorLogin
);
router.post('/refresh', requireCsrf, refreshToken);
router.post('/logout', requireCsrf, logout);
router.get('/me', protect, getMe);
router.get('/sessions', protect, getMySessions);
router.delete('/sessions/others', protect, requireCsrf, logoutOtherSessions);
router.delete(
  '/sessions/:sessionId',
  protect,
  requireCsrf,
  sessionIdParamValidator,
  validateRequest,
  revokeSession
);
router.patch(
  '/me/preferences',
  protect,
  updateMePreferencesValidator,
  validateRequest,
  updateMePreferences
);
router.get('/2fa/status', protect, getTwoFactorStatus);
router.post(
  '/2fa/setup',
  protect,
  requireCsrf,
  twoFactorSetupValidator,
  validateRequest,
  setupTwoFactor
);
router.post(
  '/2fa/enable',
  protect,
  requireCsrf,
  twoFactorEnableValidator,
  validateRequest,
  enableTwoFactor
);
router.post(
  '/2fa/disable',
  protect,
  requireCsrf,
  twoFactorDisableValidator,
  validateRequest,
  disableTwoFactor
);
router.post(
  '/2fa/recovery-codes/regenerate',
  protect,
  requireCsrf,
  twoFactorRegenerateRecoveryCodesValidator,
  validateRequest,
  regenerateTwoFactorRecoveryCodes
);

export default router;
