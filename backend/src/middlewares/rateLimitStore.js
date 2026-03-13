import { logger } from '../observability/logger.js';
import { raiseOperationalAlert } from '../observability/opsAlerting.js';

const asString = (value) => String(value || '').trim();
const asBoolean = (value) =>
  ['1', 'true', 'yes', 'on'].includes(asString(value).toLowerCase());

const rateLimitStoreState = {
  enabled: false,
  backend: 'memory',
  connected: true,
  reason: 'memory_store_default'
};

const isRedisRateLimitEnabled = () =>
  asBoolean(process.env.RATE_LIMIT_REDIS_ENABLED);

const resolveRedisUrl = () =>
  asString(process.env.RATE_LIMIT_REDIS_URL || process.env.REALTIME_REDIS_URL);

const initializeRateLimitStore = async () => {
  rateLimitStoreState.enabled = isRedisRateLimitEnabled();
  rateLimitStoreState.backend = 'memory';
  rateLimitStoreState.connected = true;
  rateLimitStoreState.reason = rateLimitStoreState.enabled
    ? 'initializing'
    : 'memory_store_default';

  if (!isRedisRateLimitEnabled()) {
    return {
      store: null,
      disconnect: async () => {}
    };
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    rateLimitStoreState.reason = 'redis_url_missing';
    logger.warn('rate_limit_redis_disabled_missing_url');
    raiseOperationalAlert({
      severity: 'WARN',
      category: 'rate_limiting',
      message:
        'RATE_LIMIT_REDIS_ENABLED=true but no Redis URL configured; using in-memory limiter',
      source: 'rate_limit_store'
    }).catch(() => {});
    return {
      store: null,
      disconnect: async () => {}
    };
  }

  try {
    const [{ default: RedisStore }, { createClient }] = await Promise.all([
      import('rate-limit-redis'),
      import('redis')
    ]);

    const client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      rateLimitStoreState.connected = false;
      rateLimitStoreState.reason = 'redis_client_error';
      logger.warn('rate_limit_redis_client_error', {
        reason: error?.message || 'Unknown redis client error'
      });
    });
    await client.connect();

    const prefix = asString(
      process.env.RATE_LIMIT_REDIS_PREFIX || 'invendex:rate-limit:'
    );
    const store = new RedisStore({
      prefix,
      sendCommand: (...args) => client.sendCommand(args)
    });

    logger.info('rate_limit_redis_enabled', {
      prefix
    });
    rateLimitStoreState.backend = 'redis';
    rateLimitStoreState.connected = true;
    rateLimitStoreState.reason = 'ok';

    return {
      store,
      disconnect: async () => {
        try {
          await client.quit();
        } catch {
          // no-op
        } finally {
          rateLimitStoreState.connected = false;
          rateLimitStoreState.reason = 'disconnected';
        }
      }
    };
  } catch (error) {
    rateLimitStoreState.reason = 'redis_packages_missing_or_failed';
    logger.warn('rate_limit_redis_packages_missing_or_failed', {
      reason:
        error?.message ||
        'Install rate-limit-redis and redis to enable distributed rate limiting'
    });
    raiseOperationalAlert({
      severity: 'WARN',
      category: 'rate_limiting',
      message:
        'Distributed rate-limit Redis unavailable; using in-memory limiter',
      context: {
        reason:
          error?.message || 'Unknown rate-limit store initialization issue'
      },
      source: 'rate_limit_store'
    }).catch(() => {});
    return {
      store: null,
      disconnect: async () => {}
    };
  }
};

const storeState = await initializeRateLimitStore();

export const sharedRateLimitStore = storeState.store || null;
export const disconnectRateLimitStore = storeState.disconnect;
export const getRateLimitStoreStatus = () => ({
  enabled: rateLimitStoreState.enabled,
  backend: rateLimitStoreState.backend,
  connected: rateLimitStoreState.connected,
  reason: rateLimitStoreState.reason
});

export default {
  sharedRateLimitStore,
  disconnectRateLimitStore,
  getRateLimitStoreStatus
};
