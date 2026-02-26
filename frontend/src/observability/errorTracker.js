import { getClientTraceId } from './traceContext.js';

const sanitize = (value) => String(value || '').trim();

const resolveProvider = () => {
  const explicit = sanitize(
    process.env.REACT_APP_ERROR_TRACKING_PROVIDER
  ).toLowerCase();
  if (explicit) return explicit;
  return sanitize(process.env.REACT_APP_ERROR_TRACKING_WEBHOOK_URL)
    ? 'webhook'
    : 'none';
};

const provider = resolveProvider();

const shouldSendWebhook = () => provider === 'webhook' || provider === 'both';

const buildPayload = (error, context = {}) => ({
  source: 'ledgerly-frontend',
  errorName: error?.name || 'Error',
  errorMessage: error?.message || 'Unknown frontend error',
  stack: error?.stack || null,
  context: {
    clientTraceId: getClientTraceId(),
    ...(context || {}),
    href:
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
  },
  occurredAt: new Date().toISOString()
});

const postWebhook = async (payload) => {
  const url = sanitize(process.env.REACT_APP_ERROR_TRACKING_WEBHOOK_URL);
  if (!url || !shouldSendWebhook()) return;
  if (typeof fetch !== 'function') return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch {
    // no-op
  }
};

export const captureFrontendException = async (error, context = {}) => {
  const payload = buildPayload(error, context);

  if (process.env.NODE_ENV !== 'production') {
    console.error('[frontend_exception]', payload);
  }

  await postWebhook(payload);
};

let hasInitializedGlobalHandlers = false;

export const initGlobalErrorTracking = () => {
  if (hasInitializedGlobalHandlers) return;
  hasInitializedGlobalHandlers = true;

  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    captureFrontendException(
      event?.error || new Error(event?.message || 'Window error'),
      {
        scope: 'window_error'
      }
    ).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const error =
      reason instanceof Error
        ? reason
        : new Error(
            typeof reason === 'string' ? reason : 'Unhandled promise rejection'
          );
    captureFrontendException(error, {
      scope: 'window_unhandledrejection'
    }).catch(() => {});
  });
};

export default {
  captureFrontendException,
  initGlobalErrorTracking
};
