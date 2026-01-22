import express from 'express';
import {
  register,
  login,
  getMe,
  refreshToken,
  logout
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { loginLimiter } from '../middlewares/loginLimiter.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;