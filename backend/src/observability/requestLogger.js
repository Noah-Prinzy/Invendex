import { logger } from './logger.js';

const asMilliseconds = (startedAt) =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

const isLikelyHealthCheck = (req) => {
  const path = String(req?.originalUrl || req?.url || '');
  return path.startsWith('/health');
};

export const requestLoggingMiddleware = (req, res, next) => {
  const enabled =
    String(process.env.REQUEST_LOG_ENABLED || 'true').toLowerCase() !== 'false';

  if (!enabled) {
    return next();
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(asMilliseconds(startedAt).toFixed(2));
    const statusCode = Number(res.statusCode || 0);

    const level =
      statusCode >= 500
        ? 'error'
        : statusCode >= 400
          ? 'warn'
          : isLikelyHealthCheck(req)
            ? 'debug'
            : 'info';

    logger[level]('http_request_completed', {
      method: req.method,
      path: req.originalUrl || req.url || null,
      statusCode,
      durationMs,
      contentLength: Number(res.getHeader('content-length') || 0) || null,
      ip: req.ip || null,
      requestId: req.requestId || null,
      clientTraceId: req.clientTraceId || null,
      organizationId: req.organizationId || req.user?.organization || null,
      userId: req.user?._id || req.user?.id || null
    });
  });

  next();
};

export default {
  requestLoggingMiddleware
};
