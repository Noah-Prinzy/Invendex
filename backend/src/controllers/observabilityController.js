import { successResponse } from '../utils/response.js';
import { isRealtimeEnabled } from '../realtime/socketServer.js';
import {
  getInventoryIntegrityHistory,
  runInventoryIntegrityCheck
} from '../services/inventory/inventoryIntegrityService.js';

const sanitize = (value) => String(value || '').trim();

const resolveErrorTrackingProvider = () => {
  const explicit = sanitize(process.env.ERROR_TRACKING_PROVIDER).toLowerCase();
  if (explicit) return explicit;
  return sanitize(process.env.ERROR_TRACKING_WEBHOOK_URL) ? 'webhook' : 'none';
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
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

export const getInventoryIntegrityReport = async (req, res, next) => {
  try {
    const maxFindings = parsePositiveInteger(req.query?.limit, 200);
    const data = await runInventoryIntegrityCheck({
      organizationId: req.organizationId,
      maxFindings,
      autoFix: false,
      actorUserId: req.user?._id || null
    });

    return successResponse(res, data, 'Inventory integrity report generated');
  } catch (error) {
    next(error);
  }
};

export const runInventoryIntegrityAutoFix = async (req, res, next) => {
  try {
    const maxFindings = parsePositiveInteger(req.query?.limit, 200);
    const data = await runInventoryIntegrityCheck({
      organizationId: req.organizationId,
      maxFindings,
      autoFix: true,
      actorUserId: req.user?._id || null
    });

    return successResponse(
      res,
      data,
      'Inventory integrity check completed with auto-fix'
    );
  } catch (error) {
    next(error);
  }
};

export const getInventoryIntegrityHistoryReport = async (req, res, next) => {
  try {
    const days = parsePositiveInteger(req.query?.days, 30);
    const limit = parsePositiveInteger(req.query?.limit, 50);
    const data = await getInventoryIntegrityHistory({
      organizationId: req.organizationId,
      days,
      limit
    });

    return successResponse(
      res,
      {
        days,
        limit,
        count: data.length,
        reports: data
      },
      'Inventory integrity history retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getObservabilityPing,
  getInventoryIntegrityReport,
  runInventoryIntegrityAutoFix,
  getInventoryIntegrityHistoryReport
};
