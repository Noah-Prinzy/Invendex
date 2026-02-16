export const errorHandler = (err, req, res, next) => {
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
      .map(entry => entry.message)
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

  const level = statusCode >= 500 ? 'error' : 'warn';
  const logger = statusCode >= 500 ? console.error : console.warn;
  logger(
    JSON.stringify({
      level,
      scope: 'api',
      message: 'request_failed',
      method: req?.method || null,
      path: req?.originalUrl || null,
      statusCode,
      error: message,
      occurredAt: new Date().toISOString()
    })
  );

  res.status(statusCode).json({
    success: false,
    message
  });
};
