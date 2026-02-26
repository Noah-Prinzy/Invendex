import rateLimit from 'express-rate-limit';
import { logAudit } from '../utils/auditLogger.js';
import { sharedRateLimitStore } from './rateLimitStore.js';

const withSharedStore = (options) => ({
  ...options,
  ...(sharedRateLimitStore ? { store: sharedRateLimitStore } : {})
});

export const loginLimiter = rateLimit(
  withSharedStore({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      message: 'Too many login attempts. Please wait 15 minutes and try again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: async (req, res) => {
      await logAudit({
        req,
        action: 'LOGIN_RATE_LIMITED',
        resource: 'AUTH',
        success: false
      });

      res.status(429).json({
        success: false,
        message:
          'Too many login attempts. Please wait 15 minutes and try again.'
      });
    }
  })
);
