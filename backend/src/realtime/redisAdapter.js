import { logger } from '../observability/logger.js';
import { raiseOperationalAlert } from '../observability/opsAlerting.js';

let redisClients = null;
const redisAdapterState = {
  enabled: false,
  configured: false,
  connected: false,
  reason: 'not_enabled'
};

const isRedisAdapterEnabled = () =>
  String(process.env.REALTIME_REDIS_ENABLED || '')
    .toLowerCase()
    .trim() === 'true';

export const configureSocketRedisAdapter = async (io) => {
  redisAdapterState.enabled = isRedisAdapterEnabled();
  redisAdapterState.configured = false;
  redisAdapterState.connected = false;
  redisAdapterState.reason = redisAdapterState.enabled
    ? 'initializing'
    : 'not_enabled';

  if (!io || !isRedisAdapterEnabled()) {
    redisAdapterState.reason = !io ? 'io_unavailable' : 'not_enabled';
    return false;
  }

  let createAdapter;
  let createClient;

  try {
    ({ createAdapter } = await import('@socket.io/redis-adapter'));
    ({ createClient } = await import('redis'));
  } catch {
    redisAdapterState.reason = 'packages_missing';
    logger.warn('realtime_redis_adapter_packages_missing', {
      reason:
        'Install @socket.io/redis-adapter and redis when REALTIME_REDIS_ENABLED=true'
    });
    raiseOperationalAlert({
      severity: 'WARN',
      category: 'realtime_scaling',
      message:
        'Realtime Redis adapter packages missing while REALTIME_REDIS_ENABLED=true',
      source: 'socket_redis_adapter'
    }).catch(() => {});
    return false;
  }

  const redisUrl = process.env.REALTIME_REDIS_URL || undefined;
  const pubClient = createClient(redisUrl ? { url: redisUrl } : undefined);
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  redisClients = { pubClient, subClient };
  redisAdapterState.configured = true;
  redisAdapterState.connected = true;
  redisAdapterState.reason = 'ok';
  logger.info('realtime_redis_adapter_enabled');
  return true;
};

export const disconnectSocketRedisAdapter = async () => {
  if (!redisClients) return;

  try {
    await Promise.all([
      redisClients.pubClient.quit(),
      redisClients.subClient.quit()
    ]);
  } catch {
    // no-op
  } finally {
    redisClients = null;
    redisAdapterState.connected = false;
    redisAdapterState.reason = redisAdapterState.enabled
      ? 'disconnected'
      : 'not_enabled';
  }
};

export const getSocketRedisAdapterStatus = () => ({
  enabled: redisAdapterState.enabled,
  configured: redisAdapterState.configured,
  connected: redisAdapterState.connected,
  reason: redisAdapterState.reason
});

export default {
  configureSocketRedisAdapter,
  disconnectSocketRedisAdapter,
  getSocketRedisAdapterStatus
};
