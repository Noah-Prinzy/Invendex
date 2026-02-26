import client from 'prom-client';

let registry = null;
let httpRequestCounter = null;
let httpRequestDurationSeconds = null;

const getMetricsEnabled = () =>
  String(process.env.METRICS_ENABLED || 'false').toLowerCase() === 'true';

const getMetricsPrefix = () =>
  String(process.env.METRICS_PREFIX || 'ledgerly_');

const getRouteLabel = (req) => {
  if (req?.route?.path) {
    const basePath = req.baseUrl || '';
    return `${basePath}${req.route.path}`;
  }

  return 'unmatched';
};

const ensureMetricsInitialized = () => {
  if (registry) return;

  registry = new client.Registry();
  client.collectDefaultMetrics({
    register: registry,
    prefix: getMetricsPrefix()
  });

  httpRequestCounter = new client.Counter({
    name: `${getMetricsPrefix()}http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  httpRequestDurationSeconds = new client.Histogram({
    name: `${getMetricsPrefix()}http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10]
  });

  registry.registerMetric(httpRequestCounter);
  registry.registerMetric(httpRequestDurationSeconds);
};

export const metricsMiddleware = (req, res, next) => {
  if (!getMetricsEnabled()) {
    return next();
  }

  ensureMetricsInitialized();

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - startedAt;
    const durationSeconds = Number(durationNs) / 1_000_000_000;
    const labels = {
      method: req.method,
      route: getRouteLabel(req),
      status_code: String(res.statusCode)
    };

    httpRequestCounter.inc(labels, 1);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  return next();
};

const isMetricsAuthorized = (req) => {
  const expectedToken = process.env.METRICS_TOKEN;
  if (!expectedToken) return true;

  const header = String(req.headers.authorization || '');
  const providedToken = header.startsWith('Bearer ')
    ? header.slice(7).trim()
    : '';

  return providedToken === expectedToken;
};

export const getMetricsHandler = async (req, res, next) => {
  try {
    if (!getMetricsEnabled()) {
      return res.status(404).json({
        success: false,
        message: 'Metrics endpoint is disabled'
      });
    }

    if (!isMetricsAuthorized(req)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized metrics access'
      });
    }

    ensureMetricsInitialized();

    res.set('Content-Type', registry.contentType);
    const payload = await registry.metrics();
    return res.status(200).send(payload);
  } catch (error) {
    return next(error);
  }
};

export default {
  metricsMiddleware,
  getMetricsHandler
};
