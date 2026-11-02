import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/authRoutes.js';
import { createOpenApiSpec } from './docs/openApiSpec.js';
import { API_ROUTE_REGISTRY } from './routes/apiRouteRegistry.js';

import { rateLimiter } from './middlewares/rateLimiter.js';
import cacheInvalidationMiddleware from './middlewares/cacheInvalidation.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { requestContextMiddleware } from './observability/requestContext.js';
import { requestLoggingMiddleware } from './observability/requestLogger.js';
import {
  getMetricsHandler,
  metricsMiddleware
} from './observability/metrics.js';
import {
  getLivenessHealth,
  getReadinessHealth
} from './observability/health.js';
import {
  createCorsOriginValidator,
  getBodyParserConfig,
  getRuntimeConfig,
  getTrustProxySetting
} from './config/envConfig.js';

dotenv.config();

const API_V1_BASE_PATH = '/api/v1';
const LEGACY_API_BASE_PATH = '/api';

const app = express();
const corsOriginValidator = createCorsOriginValidator();
const trustProxySetting = getTrustProxySetting();
const bodyParserConfig = getBodyParserConfig();
const runtimeConfig = getRuntimeConfig();
const legacyApiEnabled = runtimeConfig.legacyApi.enabled;
const openApiDocsEnabled = runtimeConfig.apiDocsEnabled;

if (trustProxySetting !== false) {
  app.set('trust proxy', trustProxySetting);
}

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
    exposedHeaders: [
      'x-request-id',
      'x-client-trace-id',
      'content-disposition',
      'content-length'
    ]
  })
);

app.use(express.json({ limit: bodyParserConfig.jsonLimit }));
app.use(
  express.urlencoded({
    extended: true,
    limit: bodyParserConfig.formLimit,
    parameterLimit: bodyParserConfig.formParameterLimit
  })
);
app.use(cookieParser());
app.use(requestContextMiddleware);
app.use(requestLoggingMiddleware);
app.use(metricsMiddleware);
app.use(cacheInvalidationMiddleware);

app.use(
  mongoSanitize({
    replaceWith: '_'
  })
);

app.use(xss());

if (runtimeConfig.httpLogger === 'morgan') {
  app.use(morgan('dev'));
}

app.use(
  '/api',
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

const mountApiRoutes = (basePath) => {
  for (const routeMount of API_ROUTE_REGISTRY) {
    app.use(`${basePath}${routeMount.path}`, routeMount.router);
  }
};

const buildApiHealthPayload = () => ({
  success: true,
  message: 'API is healthy',
  status: 'ok'
});

const mountOpenApiDocs = ({ basePath, authBasePath }) => {
  const openApiSpecPath = `${basePath}/openapi.json`;
  const openApiDocsPath = `${basePath}/docs`;

  app.get(openApiSpecPath, (req, res) => {
    const spec = createOpenApiSpec({
      title: 'Invendex API',
      version: '1.0.0',
      apiBasePath: basePath,
      authBasePath
    });

    res.status(200).json(spec);
  });

  app.use(
    openApiDocsPath,
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: {
        url: openApiSpecPath
      },
      customSiteTitle: `Invendex API Docs (${basePath})`
    })
  );
};

app.use('/auth', authRoutes);
app.use(`${API_V1_BASE_PATH}/auth`, authRoutes);
app.use(API_V1_BASE_PATH, (req, res, next) => {
  res.setHeader('x-api-version', 'v1');
  next();
});
mountApiRoutes(API_V1_BASE_PATH);
if (legacyApiEnabled) {
  app.use(LEGACY_API_BASE_PATH, (req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', runtimeConfig.legacyApi.sunset);
    res.setHeader('Link', '</api/v1>; rel="successor-version"');
    next();
  });
  mountApiRoutes(LEGACY_API_BASE_PATH);
}
if (openApiDocsEnabled) {
  mountOpenApiDocs({
    basePath: API_V1_BASE_PATH,
    authBasePath: `${API_V1_BASE_PATH}/auth`
  });
  if (legacyApiEnabled) {
    mountOpenApiDocs({
      basePath: LEGACY_API_BASE_PATH,
      authBasePath: '/auth'
    });
  }
}
app.use('/api/v2', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'API v2 is reserved and not available yet'
  });
});

app.get('/health', async (req, res, next) => {
  try {
    const readiness = await getReadinessHealth();
    const liveness = getLivenessHealth();

    res.status(readiness.ready ? 200 : 503).json({
      status: liveness.status,
      ready: readiness.ready
    });
  } catch (error) {
    next(error);
  }
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: getLivenessHealth().status });
});

app.get('/health/ready', async (req, res, next) => {
  try {
    const readiness = await getReadinessHealth();
    res.status(readiness.ready ? 200 : 503).json({
      status: readiness.status,
      ready: readiness.ready
    });
  } catch (error) {
    next(error);
  }
});

app.get('/metrics', getMetricsHandler);

app.get('/api/health', (req, res) => {
  res.status(200).json(buildApiHealthPayload());
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json(buildApiHealthPayload());
});

app.use(errorHandler);

export default app;
