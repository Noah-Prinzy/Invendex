import express from 'express';
import {
  register,
  login,
  adminLogin,
  employeeLogin,
  getMe,
  refreshToken,
  logout,
  requestEmailVerification,
  verifyEmail,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';
import validateRequest from '../middlewares/validateRequest.js';
import { issueCsrfToken, requireCsrf } from '../middlewares/csrfProtection.js';
import {
  registerValidator,
  loginValidator,
  employeeLoginValidator,
  requestEmailVerificationValidator,
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} from '../validations/authValidator.js';

const router = express.Router();

router.get('/csrf-token', issueCsrfToken);
router.post('/register', registerValidator, validateRequest, register);
router.post('/login', loginLimiter, loginValidator, validateRequest, login);
router.post(
  '/admin/login',
  loginLimiter,
  loginValidator,
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
router.post('/refresh', requireCsrf, refreshToken);
router.post('/logout', requireCsrf, logout);
router.get('/me', protect, getMe);

export default router;
