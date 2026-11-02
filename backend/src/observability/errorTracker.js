import { getRuntimeConfig } from '../config/envConfig.js';
import { getRequestContext } from './requestContext.js';
import { logger } from './logger.js';

const sanitize = (value) => String(value || '').trim();
const asNumber = (value) => {
  const parsed = Number.parseFloat(sanitize(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveProvider = () =>
  getRuntimeConfig().observability.errorTracking.provider;

const providerIncludesWebhook = (provider) =>
  provider === 'webhook' || provider === 'both';

const providerIncludesSentry = (provider) =>
  provider === 'sentry' || provider === 'both';

const provider = resolveProvider();
const sentryDsn = getRuntimeConfig().observability.errorTracking.sentryDsn;
const errorTrackingTimeoutMs =
  getRuntimeConfig().observability.errorTracking.timeoutMs;

let warnedMissingSentryPackage = false;
let warnedMissingSentryDsn = false;
let sentryModulePromise = null;
let sentryEnabled = false;

const sanitizeObject = (value) => {
  if (!value || typeof value !== 'object') return {};

  const copy = {};
  for (const [key, currentValue] of Object.entries(value)) {
    if (currentValue === undefined) continue;
    copy[key] = currentValue;
  }

  return copy;
};

const getMergedContext = (context) => {
  const requestContext = getRequestContext();
  const safeContext = sanitizeObject(context);
  return {
    requestId: safeContext.requestId || requestContext?.requestId || null,
    ...safeContext
  };
};

const postErrorWebhook = async (payload) => {
  const url = getRuntimeConfig().observability.errorTracking.webhookUrl;
  if (!url || !providerIncludesWebhook(provider)) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(errorTrackingTimeoutMs)
    });
  } catch (err) {
    logger.warn('error_webhook_delivery_failed', {
      reason: err?.message || 'Unknown webhook delivery error'
    });
  }
};

const getSentryModule = async () => {
  if (!providerIncludesSentry(provider)) return null;

  if (!sentryDsn) {
    if (!warnedMissingSentryDsn) {
      warnedMissingSentryDsn = true;
      logger.warn('error_tracker_sentry_missing_dsn');
    }
    return null;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import('@sentry/node')
      .then((module) => {
        const tracesSampleRate =
          getRuntimeConfig().observability.errorTracking.sentryTracesSampleRate;
        module.init({
          dsn: sentryDsn,
          environment: getRuntimeConfig().nodeEnv,
          tracesSampleRate: Math.max(0, Math.min(1, tracesSampleRate))
        });
        sentryEnabled = true;
        logger.info('error_tracker_sentry_initialized');
        return module;
      })
      .catch((error) => {
        if (!warnedMissingSentryPackage) {
          warnedMissingSentryPackage = true;
          logger.warn('error_tracker_sentry_unavailable', {
            reason:
              error?.message ||
              'Install @sentry/node or disable sentry provider'
          });
        }
        return null;
      });
  }

  return sentryModulePromise;
};

const captureWithSentry = async (error, context) => {
  const sentry = await getSentryModule();
  if (!sentry || !sentryEnabled) return;

  sentry.withScope((scope) => {
    const safeContext = sanitizeObject(context);
    if (safeContext.requestId) {
      scope.setTag('request_id', String(safeContext.requestId));
    }
    if (safeContext.scope) {
      scope.setTag('scope', String(safeContext.scope));
    }
    scope.setContext('invendex_context', safeContext);
    sentry.captureException(error);
  });
};

export const captureException = async (error, context = {}) => {
  const mergedContext = getMergedContext(context);

  const payload = {
    errorName: error?.name || 'Error',
    errorMessage: error?.message || 'Unknown error',
    stack: error?.stack || null,
    context: mergedContext,
    occurredAt: new Date().toISOString()
  };

  logger.error('exception_captured', payload);

  await Promise.allSettled([
    postErrorWebhook(payload),
    captureWithSentry(error, mergedContext)
  ]);
};

export const flushErrorTracker = async (timeoutMs = errorTrackingTimeoutMs) => {
  if (!sentryEnabled) return;

  try {
    const sentry = await getSentryModule();
    if (!sentry) return;
    await sentry.flush(timeoutMs);
  } catch (error) {
    logger.warn('error_tracker_flush_failed', {
      reason: error?.message || 'Unknown flush error'
    });
  }
};

export default {
  captureException,
  flushErrorTracker
};
