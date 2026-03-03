import { invalidateQueryCacheByOrganization } from '../services/cache/queryCacheService.js';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const cacheInvalidationMiddleware = (req, res, next) => {
  res.on('finish', () => {
    const method = String(req.method || '').toUpperCase();
    if (!MUTATION_METHODS.has(method)) return;
    if (Number(res.statusCode || 500) >= 500) return;

    const organizationId = req.organizationId || req.user?.organization;
    if (!organizationId) return;

    invalidateQueryCacheByOrganization(String(organizationId));
  });

  return next();
};

export default cacheInvalidationMiddleware;
