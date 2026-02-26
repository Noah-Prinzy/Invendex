export default (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // 🔒 Log only unexpected errors
  if (!err.isOperational) {
    console.error('🔥 UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    status,
    message:
      statusCode === 500
        ? 'Something went wrong. Please try again later.'
        : err.message
  });
};
import rateLimit from 'express-rate-limit';

/**
 * 🌍 Generic rate limiter factory (already used globally)
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
    message: {
      success: false,
      message
    }
  });
