import { successResponse } from '../utils/response.js';
import { getRuntimeConfig } from '../config/envConfig.js';
import { isRealtimeEnabled } from '../realtime/socketServer.js';
import { getSocketRedisAdapterStatus } from '../realtime/redisAdapter.js';
import { getRateLimitStoreStatus } from '../middlewares/rateLimitStore.js';
import {
  getInventoryIntegrityHistory,
  runInventoryIntegrityCheck
} from '../services/inventory/inventoryIntegrityService.js';
import {
  listOperationalAlerts,
  resolveOperationalAlert
} from '../observability/opsAlerting.js';

const _sanitize = (value) => String(value || '').trim();

const resolveErrorTrackingProvider = () =>
  getRuntimeConfig().observability.errorTracking.provider;

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
      getRuntimeConfig().observability.errorTracking.webhookUrl
    );
    const sentryConfigured = Boolean(
      getRuntimeConfig().observability.errorTracking.sentryDsn
    );

    return successResponse(
      res,
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: getRuntimeConfig().nodeEnv,
        organizationId: req.organizationId || null,
        userId: req.user?._id || req.user?.id || null,
        trace: {
          requestId: req.requestId || null,
          clientTraceId: req.clientTraceId || null
        },
        realtime: {
          enabled: isRealtimeEnabled(),
          redisAdapter: getSocketRedisAdapterStatus()
        },
        rateLimiting: {
          store: getRateLimitStoreStatus()
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

export const getObservabilityRuntime = async (req, res, next) => {
  try {
    return successResponse(
      res,
      {
        runtime: {
          nodeVersion: process.version,
          pid: process.pid,
          uptimeSeconds: Math.floor(process.uptime()),
          environment: getRuntimeConfig().nodeEnv
        },
        realtime: {
          enabled: isRealtimeEnabled(),
          redisAdapter: getSocketRedisAdapterStatus()
        },
        rateLimiting: {
          store: getRateLimitStoreStatus()
        }
      },
      'Observability runtime status retrieved'
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

export const getOperationalAlerts = async (req, res, next) => {
  try {
    const alerts = await listOperationalAlerts({
      organizationId: req.organizationId || null,
      severity: req.query.severity || null,
      limit: req.query.limit || 50,
      includeResolved: req.query.includeResolved === 'true'
    });

    return successResponse(
      res,
      {
        count: alerts.length,
        alerts
      },
      'Operational alerts retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export const patchResolveOperationalAlert = async (req, res, next) => {
  try {
    const alert = await resolveOperationalAlert({
      alertId: req.params.alertId
    });

    return successResponse(res, alert, 'Operational alert resolved');
  } catch (error) {
    next(error);
  }
};

export default {
  getObservabilityPing,
  getObservabilityRuntime,
  getInventoryIntegrityReport,
  runInventoryIntegrityAutoFix,
  getInventoryIntegrityHistoryReport,
  getOperationalAlerts,
  patchResolveOperationalAlert
};
