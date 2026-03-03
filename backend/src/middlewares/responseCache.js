import {
  buildQueryCacheKey,
  getCachedQueryResponse,
  setCachedQueryResponse
} from '../services/cache/queryCacheService.js';

const parseTtlMs = (value, fallbackMs) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const DEFAULT_CACHE_TTL_MS = parseTtlMs(
  process.env.API_QUERY_CACHE_DEFAULT_TTL_MS,
  60 * 1000
);

const responseCache =
  ({ namespace = 'default', ttlMs = DEFAULT_CACHE_TTL_MS } = {}) =>
  (req, res, next) => {
    if (String(req.method || '').toUpperCase() !== 'GET') {
      return next();
    }

    const organizationId = req.organizationId || req.user?.organization || null;
    const cacheKey = buildQueryCacheKey({
      namespace,
      organizationId,
      path: req.path || req.originalUrl || req.url,
      query: req.query || {}
    });

    const cached = getCachedQueryResponse(cacheKey);
    if (cached) {
      res.setHeader('x-query-cache', 'HIT');
      return res.status(cached.statusCode).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const statusCode = Number(res.statusCode || 200);
      if (statusCode >= 200 && statusCode < 300) {
        setCachedQueryResponse({
          cacheKey,
          ttlMs,
          payload: {
            statusCode,
            body
          },
          tags: organizationId
            ? [`org:${String(organizationId).toLowerCase()}`]
            : []
        });
      }
      res.setHeader('x-query-cache', 'MISS');
      return originalJson(body);
    };

    return next();
  };

export default responseCache;
