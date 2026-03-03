import { getApiRateLimitForOrganization } from './subscriptionService.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_FALLBACK_LIMIT = 300;

const requestCounters = new Map();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isEnabled = () =>
  !['false', '0', 'off', 'no'].includes(
    String(process.env.SUBSCRIPTION_RATE_LIMIT_ENABLED || 'true')
      .trim()
      .toLowerCase()
  );

const isTestMode = () => String(process.env.NODE_ENV || '') === 'test';

const getWindowMs = () =>
  parseInteger(
    process.env.SUBSCRIPTION_RATE_LIMIT_WINDOW_MS,
    DEFAULT_WINDOW_MS
  );

const getFallbackLimit = () =>
  parseInteger(
    process.env.SUBSCRIPTION_RATE_LIMIT_FALLBACK_LIMIT,
    DEFAULT_FALLBACK_LIMIT
  );

const buildCounterKey = (organizationId, windowStartMs) =>
  `${String(organizationId || '').trim()}:${windowStartMs}`;

export const clearSubscriptionRateLimitCounters = () => {
  requestCounters.clear();
};

const getOrCreateWindowCounter = async ({ organizationId, now }) => {
  const windowMs = getWindowMs();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStartMs + windowMs;
  const counterKey = buildCounterKey(organizationId, windowStartMs);

  let counter = requestCounters.get(counterKey);
  if (!counter) {
    const limit = await getApiRateLimitForOrganization({
      organizationId,
      fallbackLimit: getFallbackLimit()
    });
    counter = {
      organizationId: String(organizationId || '').trim(),
      limit,
      count: 0,
      resetAt
    };
    requestCounters.set(counterKey, counter);
  }

  return counter;
};

export const enforceSubscriptionTierRateLimit = async ({
  organizationId,
  req = null,
  res = null
}) => {
  if (!isEnabled() || isTestMode()) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      retryAfterSeconds: 0
    };
  }

  if (
    req &&
    ['OPTIONS', 'HEAD'].includes(String(req.method || '').toUpperCase())
  ) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      retryAfterSeconds: 0
    };
  }

  const normalizedOrganizationId = String(organizationId || '').trim();
  if (!normalizedOrganizationId) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      retryAfterSeconds: 0
    };
  }

  const now = Date.now();
  const counter = await getOrCreateWindowCounter({
    organizationId: normalizedOrganizationId,
    now
  });

  counter.count += 1;
  const allowed = counter.count <= counter.limit;
  const remaining = Math.max(counter.limit - counter.count, 0);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((counter.resetAt - now) / 1000)
  );

  if (res) {
    res.setHeader('x-tier-ratelimit-limit', String(counter.limit));
    res.setHeader('x-tier-ratelimit-remaining', String(remaining));
    res.setHeader(
      'x-tier-ratelimit-reset',
      String(Math.ceil(counter.resetAt / 1000))
    );
    if (!allowed) {
      res.setHeader('retry-after', String(retryAfterSeconds));
    }
  }

  return {
    allowed,
    limit: counter.limit,
    remaining,
    retryAfterSeconds
  };
};

export default {
  clearSubscriptionRateLimitCounters,
  enforceSubscriptionTierRateLimit
};
