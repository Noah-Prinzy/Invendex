import { successResponse } from '../utils/response.js';
import { isRealtimeEnabled } from '../realtime/socketServer.js';

const sanitize = (value) => String(value || '').trim();

const resolveErrorTrackingProvider = () => {
  const explicit = sanitize(process.env.ERROR_TRACKING_PROVIDER).toLowerCase();
  if (explicit) return explicit;
  return sanitize(process.env.ERROR_TRACKING_WEBHOOK_URL) ? 'webhook' : 'none';
};

export const getObservabilityPing = async (req, res, next) => {
  try {
    const provider = resolveErrorTrackingProvider();
    const webhookEnabled = Boolean(
      sanitize(process.env.ERROR_TRACKING_WEBHOOK_URL)
    );
    const sentryConfigured = Boolean(
      sanitize(process.env.ERROR_TRACKING_SENTRY_DSN)
    );

    return successResponse(
      res,
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: sanitize(process.env.NODE_ENV || 'development'),
        organizationId: req.organizationId || null,
        userId: req.user?._id || req.user?.id || null,
        trace: {
          requestId: req.requestId || null,
          clientTraceId: req.clientTraceId || null
        },
        realtime: {
          enabled: isRealtimeEnabled()
        },
        errorTracking: {
          provider,
          webhookEnabled,
          sentryConfigured
        }
      },
      'Observability ping successful'
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getObservabilityPing
};
