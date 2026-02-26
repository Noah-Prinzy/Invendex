import { logger } from '../observability/logger.js';

const asString = (value) => String(value || '').trim();
const asBoolean = (value) =>
  ['1', 'true', 'yes', 'on'].includes(asString(value).toLowerCase());

const isRedisRateLimitEnabled = () =>
  asBoolean(process.env.RATE_LIMIT_REDIS_ENABLED);

const resolveRedisUrl = () =>
  asString(process.env.RATE_LIMIT_REDIS_URL || process.env.REALTIME_REDIS_URL);

const initializeRateLimitStore = async () => {
  if (!isRedisRateLimitEnabled()) {
    return {
      store: null,
      disconnect: async () => {}
    };
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    logger.warn('rate_limit_redis_disabled_missing_url');
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
      logger.warn('rate_limit_redis_client_error', {
        reason: error?.message || 'Unknown redis client error'
      });
    });
    await client.connect();

    const prefix = asString(
      process.env.RATE_LIMIT_REDIS_PREFIX || 'ledgerly:rate-limit:'
    );
    const store = new RedisStore({
      prefix,
      sendCommand: (...args) => client.sendCommand(args)
    });

    logger.info('rate_limit_redis_enabled', {
      prefix
    });

    return {
      store,
      disconnect: async () => {
        try {
          await client.quit();
        } catch {
          // no-op
        }
      }
    };
  } catch (error) {
    logger.warn('rate_limit_redis_packages_missing_or_failed', {
      reason:
        error?.message ||
        'Install rate-limit-redis and redis to enable distributed rate limiting'
    });
    return {
      store: null,
      disconnect: async () => {}
    };
  }
};

const storeState = await initializeRateLimitStore();

export const sharedRateLimitStore = storeState.store || null;
export const disconnectRateLimitStore = storeState.disconnect;

export default {
  sharedRateLimitStore,
  disconnectRateLimitStore
};
