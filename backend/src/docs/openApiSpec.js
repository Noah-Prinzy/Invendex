import authRoutes from '../routes/authRoutes.js';
import { API_ROUTE_REGISTRY } from '../routes/apiRouteRegistry.js';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head'
];

const normalizePath = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '/';

  const normalized = raw.replace(/\\/g, '/');
  if (normalized === '/') return '/';
  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const joinPaths = (left = '/', right = '/') => {
  const normalizedLeft = normalizePath(left);
  const normalizedRight = normalizePath(right);

  if (normalizedRight === '/') return normalizedLeft;
  if (normalizedLeft === '/') return normalizedRight;

  return normalizePath(`${normalizedLeft}/${normalizedRight}`);
};

const toOpenApiPath = (pathName = '/') =>
  normalizePath(pathName).replace(/:([A-Za-z0-9_]+)/g, '{$1}');

const isPublicAuthPath = (pathName = '') => {
  const normalized = String(pathName || '').toLowerCase();
  const publicRoutePatterns = [
    '/auth/login',
    '/auth/register',
    '/auth/employee/login',
    '/auth/employee/signup',
    '/auth/admin/login',
    '/auth/employee/first-login',
    '/auth/refresh',
    '/auth/verify-2fa',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/employee/login',
    '/api/v1/auth/employee/signup',
    '/api/v1/auth/admin/login',
    '/api/v1/auth/employee/first-login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/verify-2fa',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email'
  ];

  return publicRoutePatterns.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
};

const buildOperationObject = ({ method, pathName, tag }) => {
  const upperMethod = String(method || '').toUpperCase();
  const summary = `${upperMethod} ${pathName}`;
  const security = isPublicAuthPath(pathName)
    ? []
    : [{ BearerAuth: [] }, { RefreshCookie: [] }];

  return {
    tags: [tag],
    operationId: `${upperMethod}_${pathName}`
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, ''),
    summary,
    security,
    responses: {
      200: {
        description: 'Success'
      },
      400: {
        description: 'Bad request'
      },
      401: {
        description: 'Unauthorized'
      },
      403: {
        description: 'Forbidden'
      },
      429: {
        description: 'Rate limited'
      },
      500: {
        description: 'Internal server error'
      }
    }
  };
};

const appendRouterPaths = ({ router, mountPath, tag, paths }) => {
  if (!router?.stack || !Array.isArray(router.stack)) return;

  for (const layer of router.stack) {
    if (!layer?.route) continue;
    const route = layer.route;
    const methods = Object.keys(route.methods || {}).filter((method) =>
      HTTP_METHODS.includes(method)
    );
    if (!methods.length) continue;

    const rawPaths = Array.isArray(route.path) ? route.path : [route.path];
    for (const rawPath of rawPaths) {
      const fullPath = toOpenApiPath(joinPaths(mountPath, rawPath || '/'));
      if (!paths[fullPath]) {
        paths[fullPath] = {};
      }

      for (const method of methods) {
        paths[fullPath][method] = buildOperationObject({
          method,
          pathName: fullPath,
          tag
        });
      }
    }
  }
};

const buildServerList = ({ apiBasePath = '/api/v1' }) => {
  const explicitBaseUrl = String(process.env.PUBLIC_API_BASE_URL || '').trim();
  if (explicitBaseUrl) {
    return [{ url: `${explicitBaseUrl}${normalizePath(apiBasePath)}` }];
  }

  return [{ url: normalizePath(apiBasePath) }];
};

export const createOpenApiSpec = ({
  title = 'Ledgerly API',
  version = '1.0.0',
  apiBasePath = '/api/v1',
  authBasePath = '/api/v1/auth'
} = {}) => {
  const normalizedApiBasePath = normalizePath(apiBasePath);
  const normalizedAuthBasePath = normalizePath(authBasePath);
  const paths = {};
  const tags = [];
  const seenTags = new Set();

  for (const routeMount of API_ROUTE_REGISTRY) {
    const tag = routeMount.tag || 'API';
    if (!seenTags.has(tag)) {
      seenTags.add(tag);
      tags.push({ name: tag });
    }
    appendRouterPaths({
      router: routeMount.router,
      mountPath: joinPaths(normalizedApiBasePath, routeMount.path),
      tag,
      paths
    });
  }

  if (!seenTags.has('Auth')) {
    tags.push({ name: 'Auth' });
  }
  appendRouterPaths({
    router: authRoutes,
    mountPath: normalizedAuthBasePath,
    tag: 'Auth',
    paths
  });

  const healthPath = toOpenApiPath(joinPaths(normalizedApiBasePath, '/health'));
  paths[healthPath] = {
    get: {
      tags: ['Observability'],
      operationId: 'GET_health',
      summary: 'Health check endpoint',
      security: [],
      responses: {
        200: { description: 'Healthy' },
        503: { description: 'Degraded' }
      }
    }
  };

  return {
    openapi: '3.0.3',
    info: {
      title,
      version,
      description:
        'Auto-generated OpenAPI spec from mounted Ledgerly route modules.'
    },
    servers: buildServerList({ apiBasePath: normalizedApiBasePath }),
    tags,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        RefreshCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken'
        }
      }
    },
    paths
  };
};

export default {
  createOpenApiSpec
};
