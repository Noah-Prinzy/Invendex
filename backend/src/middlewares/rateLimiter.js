import rateLimit from 'express-rate-limit';
import AppError from '../utils/AppError.js';

/**
 * 🌍 Generic rate limiter factory
 */
export const rateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later'
}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new AppError(message, 429));
    }
  });

/**
 * 🔧 Helper to create limiters
 */
const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message
  });
/**
 * 🔐 Targeted Rate Limiters (A26.6)
 * Used ONLY on sensitive / high-impact routes
 */

/**
 * ➕ Create product
 */
export const createProductLimiter = rateLimiter({
  max: 20,
  message: 'Too many product creations, slow down'
});

/**
 * ✏️ Update product
 */
export const updateProductLimiter = rateLimiter({
  max: 30,
  message: 'Too many product updates, slow down'
});

/**
 * 📦 Adjust product stock
 */
export const adjustStockLimiter = rateLimiter({
  max: 40,
  message: 'Too many stock adjustments, slow down'
});

/**
 * 🚨 Manual reorder alert
 */
export const manualReorderAlertLimiter = rateLimiter({
  max: 10,
  message: 'Too many manual reorder alerts'
});

/**
 * ✅ Resolve reorder alert
 */
export const resolveReorderAlertLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many reorder alerts resolved. Please slow down.'
});

/**
 * 🤖 Run automatic reorder engine
 */
export const runReorderEngineLimiter = rateLimiter({
  max: 5,
  message: 'Reorder engine triggered too frequently'
});

/**
 * 🧾 Create purchase order
 */
export const createPurchaseOrderLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many purchase orders created. Please slow down.'
});

/**
 * 🤖 Generate purchase orders from alerts
 */
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