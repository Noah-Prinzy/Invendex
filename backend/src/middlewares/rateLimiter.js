import rateLimit from 'express-rate-limit';
import AppError from '../utils/AppError.js';
import { sharedRateLimitStore } from './rateLimitStore.js';

const withSharedStore = (options) => ({
  ...options,
  ...(sharedRateLimitStore ? { store: sharedRateLimitStore } : {})
});

/**
 * Generic rate limiter factory
 */
export const rateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later'
}) =>
  rateLimit(
    withSharedStore({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next) => {
        next(new AppError(message, 429));
      }
    })
  );

/**
 * Helper to create limiters
 */
const createLimiter = ({ windowMs, max, message }) =>
  rateLimit(
    withSharedStore({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message
    })
  );

/**
 * Targeted Rate Limiters (A26.6)
 * Used only on sensitive / high-impact routes.
 */

export const createProductLimiter = rateLimiter({
  max: 20,
  message: 'Too many product creations, slow down'
});

export const updateProductLimiter = rateLimiter({
  max: 30,
  message: 'Too many product updates, slow down'
});

export const adjustStockLimiter = rateLimiter({
  max: 40,
  message: 'Too many stock adjustments, slow down'
});

export const manualReorderAlertLimiter = rateLimiter({
  max: 10,
  message: 'Too many manual reorder alerts'
});

export const resolveReorderAlertLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many reorder alerts resolved. Please slow down.'
});

export const runReorderEngineLimiter = rateLimiter({
  max: 5,
  message: 'Reorder engine triggered too frequently'
});

export const createPurchaseOrderLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many purchase orders created. Please slow down.'
});

export const generatePOFromAlertsLimiter = rateLimiter({
  max: 5,
  message: 'PO generation from alerts is rate limited'
});

export const sendPurchaseOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: 'Too many purchase orders sent. Please slow down.'
});

export const receivePurchaseOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: 'Too many purchase orders received. Please slow down.'
});

export const closePurchaseOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many purchase orders closed. Please slow down.'
});

export const cancelPurchaseOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many purchase orders cancelled. Please slow down.'
});

export const generatePurchaseOrdersLimiter = createLimiter({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: 'Too many automatic purchase order generations.'
});

export const reserveSerialsLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 80,
  message: 'Too many serial reservation requests. Please slow down.'
});

export const releaseSerialsLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 80,
  message: 'Too many serial release requests. Please slow down.'
});

export const verifySerialScanLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 120,
  message: 'Too many serial scan verifications. Please slow down.'
});

export const recallBatchLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many batch recalls. Please slow down.'
});

export const createOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  message: 'Too many order creations. Please slow down.'
});

export const completeOrderLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 80,
  message: 'Too many order completions. Please slow down.'
});

export const wmsMutationLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: 'Too many warehouse mutation requests. Please slow down.'
});

export const createUserInviteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many invite creation requests. Please slow down.'
});

export const revokeUserInviteLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many invite revoke requests. Please slow down.'
});

export const updateUserStatusLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many user status updates. Please slow down.'
});
