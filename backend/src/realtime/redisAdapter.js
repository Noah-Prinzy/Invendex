let redisClients = null;

const isRedisAdapterEnabled = () =>
  String(process.env.REALTIME_REDIS_ENABLED || '')
    .toLowerCase()
    .trim() === 'true';

export const configureSocketRedisAdapter = async io => {
  if (!io || !isRedisAdapterEnabled()) {
    return false;
  }

  let createAdapter;
  let createClient;

  try {
    ({ createAdapter } = await import('@socket.io/redis-adapter'));
    ({ createClient } = await import('redis'));
  } catch (err) {
    console.warn(
      '[realtime] Redis adapter requested but packages are missing. Install @socket.io/redis-adapter and redis.'
    );
    return false;
  }

  const redisUrl = process.env.REALTIME_REDIS_URL || undefined;
  const pubClient = createClient(redisUrl ? { url: redisUrl } : undefined);
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  redisClients = { pubClient, subClient };
  console.log('[realtime] Redis adapter enabled');
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
  }
};

export default {
  configureSocketRedisAdapter,
  disconnectSocketRedisAdapter
};
