import { captureException } from '../observability/errorTracker.js';
import { logger } from '../observability/logger.js';
import { raiseOperationalAlert } from '../observability/opsAlerting.js';

const recentAlertMap = new Map();
const ALERT_COOLDOWN_MS = Number(process.env.OPS_ALERT_COOLDOWN_MS || 60_000);

const shouldRaiseAlert = ({ path, statusCode }) => {
  const key = `${String(path || 'unknown')}|${Number(statusCode || 500)}`;
  const now = Date.now();
  const previous = recentAlertMap.get(key) || 0;
  if (now - previous < ALERT_COOLDOWN_MS) {
    return false;
  }
  recentAlertMap.set(key, now);
  return true;
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `${field} already exists`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((entry) => entry.message)
      .join(', ');
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  const logMeta = {
    scope: 'api',
    event: 'request_failed',
    method: req?.method || null,
    path: req?.originalUrl || null,
    statusCode,
    error: message,
    requestId: req?.requestId || null,
    clientTraceId: req?.clientTraceId || null,
    organizationId: req?.organizationId || req?.user?.organization || null,
    userId: req?.user?._id || req?.user?.id || null
  };

  if (statusCode >= 500) {
    logger.error('request_failed', {
      ...logMeta,
      err
    });

    captureException(err, {
      ...logMeta,
      requestId: req?.requestId || null,
      clientTraceId: req?.clientTraceId || null
    }).catch(() => {
      // no-op: error reporting cannot block response path
    });

    if (
      shouldRaiseAlert({
        path: req?.originalUrl || null,
        statusCode
      })
    ) {
      raiseOperationalAlert({
        severity: 'ERROR',
        category: 'api_error',
        message: `API request failed with ${statusCode}`,
        context: {
          method: req?.method || null,
          path: req?.originalUrl || null,
          requestId: req?.requestId || null,
          clientTraceId: req?.clientTraceId || null
        },
        organizationId: req?.organizationId || req?.user?.organization || null,
        source: 'error_handler'
      }).catch(() => {});
    }
  } else {
    logger.warn('request_failed', logMeta);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
