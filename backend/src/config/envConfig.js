import { logger } from '../observability/logger.js';

const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const DEFAULT_WEAK_SECRETS = new Set([
  'access_secret',
  'refresh_secret',
  'changeme',
  'change_me',
  'secret',
  'password',
  'jwt_secret',
  'test_access_secret',
  'test_refresh_secret'
]);

const asString = (value) => String(value || '').trim();

const asBoolean = (value) =>
  ['1', 'true', 'yes', 'on'].includes(asString(value).toLowerCase());
const asInteger = (value) => {
  const parsed = Number.parseInt(asString(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const asNumber = (value) => {
  const parsed = Number.parseFloat(asString(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCsv = (value) =>
  asString(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeOrigins = (value) => {
  const raw = asString(value);
  if (!raw) return [];
  if (raw === '*') return ['*'];
  return parseCsv(raw);
};

export const getAllowedCorsOrigins = () => {
  const explicit = normalizeOrigins(process.env.CORS_ORIGIN);
  if (explicit.length) return explicit;

  const socketFallback = normalizeOrigins(process.env.SOCKET_CORS_ORIGIN);
  if (socketFallback.length) return socketFallback;

  if (asString(process.env.NODE_ENV || 'development') === 'production') {
    return [];
  }

  return [...DEFAULT_DEV_CORS_ORIGINS];
};

export const getBodyParserConfig = () => {
  const jsonBodyMb = asNumber(process.env.MAX_JSON_BODY_MB);
  const formBodyMb = asNumber(process.env.MAX_FORM_BODY_MB);
  const formParamLimit = asInteger(process.env.MAX_FORM_PARAM_COUNT);

  const normalizedJsonBodyMb = jsonBodyMb && jsonBodyMb > 0 ? jsonBodyMb : 1;
  const normalizedFormBodyMb = formBodyMb && formBodyMb > 0 ? formBodyMb : 1;
  const normalizedFormParamLimit =
    formParamLimit && formParamLimit > 0 ? formParamLimit : 1000;

  return {
    jsonLimit: `${normalizedJsonBodyMb}mb`,
    formLimit: `${normalizedFormBodyMb}mb`,
    formParameterLimit: normalizedFormParamLimit
  };
};

export const getHttpServerTimeoutConfig = () => {
  const requestTimeoutMs = asInteger(process.env.HTTP_REQUEST_TIMEOUT_MS);
  const headersTimeoutMs = asInteger(process.env.HTTP_HEADERS_TIMEOUT_MS);
  const keepAliveTimeoutMs = asInteger(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS);

  return {
    requestTimeoutMs:
      requestTimeoutMs && requestTimeoutMs > 0 ? requestTimeoutMs : 30_000,
    headersTimeoutMs:
      headersTimeoutMs && headersTimeoutMs > 0 ? headersTimeoutMs : 35_000,
    keepAliveTimeoutMs:
      keepAliveTimeoutMs && keepAliveTimeoutMs > 0 ? keepAliveTimeoutMs : 5_000
  };
};

export const createCorsOriginValidator = () => {
  const allowedOrigins = getAllowedCorsOrigins();
  const wildcard = allowedOrigins.includes('*');
  const allowSet = new Set(allowedOrigins);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (wildcard || allowSet.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  };
};

export const getSocketCorsOrigin = () => {
  const allowedOrigins = getAllowedCorsOrigins();
  if (allowedOrigins.length === 0) return false;
  if (allowedOrigins.includes('*')) return '*';
  return allowedOrigins;
};

const normalizeSameSiteValue = (value) => {
  const normalized = asString(value).toLowerCase();
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return 'lax';
};

const resolveUseSecureCookies = () => {
  const explicit = asString(process.env.COOKIE_SECURE);
  if (explicit) return asBoolean(explicit);

  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  return nodeEnv === 'production' || nodeEnv === 'staging';
};

const resolveCookieSameSite = (useSecureCookies) => {
  const explicit = asString(process.env.COOKIE_SAMESITE);
  const sameSite = normalizeSameSiteValue(
    explicit || (useSecureCookies ? 'none' : 'lax')
  );

  if (sameSite === 'none' && !useSecureCookies) {
    return 'lax';
  }

  return sameSite;
};

const resolveCookieDomain = () => {
  const domain = asString(process.env.COOKIE_DOMAIN);
  return domain || undefined;
};

export const getCookieSecurityProfile = () => {
  const useSecureCookies = resolveUseSecureCookies();
  const sameSite = resolveCookieSameSite(useSecureCookies);
  const domain = resolveCookieDomain();

  return {
    useSecureCookies,
    sameSite,
    domain
  };
};

export const getRefreshCookieOptions = () => {
  const { useSecureCookies, sameSite, domain } = getCookieSecurityProfile();

  return {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth',
    ...(domain ? { domain } : {})
  };
};

export const getClearRefreshCookieOptions = () => {
  const { useSecureCookies, sameSite, domain } = getCookieSecurityProfile();

  return {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite,
    path: '/auth',
    ...(domain ? { domain } : {})
  };
};

export const getCsrfCookieOptions = () => {
  const { useSecureCookies, sameSite, domain } = getCookieSecurityProfile();
  const maxAge =
    asInteger(process.env.CSRF_COOKIE_MAX_AGE_MS) || 24 * 60 * 60 * 1000;

  return {
    httpOnly: false,
    secure: useSecureCookies,
    sameSite,
    maxAge,
    path: '/',
    ...(domain ? { domain } : {})
  };
};

export const getTrustProxySetting = () => {
  const explicit = asString(process.env.TRUST_PROXY);
  if (!explicit) {
    return asString(process.env.NODE_ENV || 'development') === 'production'
      ? 1
      : false;
  }

  const normalized = explicit.toLowerCase();
  if (['false', 'off', '0', 'no'].includes(normalized)) return false;
  if (['true', 'on', 'yes'].includes(normalized)) return 1;

  const maybeInteger = asInteger(explicit);
  if (maybeInteger != null) return maybeInteger;
  return explicit;
};

const validateDbUrl = (issues) => {
  const dbUrl = asString(process.env.DB_URL);
  if (!dbUrl) {
    issues.push('DB_URL is required');
    return;
  }

  if (dbUrl.includes('${')) {
    issues.push('DB_URL contains unresolved template variables');
  }

  if (!dbUrl.startsWith('mongodb://') && !dbUrl.startsWith('mongodb+srv://')) {
    issues.push('DB_URL must start with "mongodb://" or "mongodb+srv://"');
  }
};

const validateSecret = (key, issues, warnings, nodeEnv) => {
  const value = asString(process.env[key]);
  if (!value) {
    issues.push(`${key} is required`);
    return;
  }

  if (value.length < 16 || DEFAULT_WEAK_SECRETS.has(value.toLowerCase())) {
    const message = `${key} should be strong (min 16 chars and not a default placeholder)`;
    if (nodeEnv === 'production') {
      issues.push(message);
      return;
    }

    warnings.push(message);
  }
};

const validatePreviousSecretChain = (
  primaryKey,
  previousKey,
  issues,
  warnings,
  nodeEnv
) => {
  validateSecret(primaryKey, issues, warnings, nodeEnv);

  const primaryValue = asString(process.env[primaryKey]);
  const previousValues = parseCsv(process.env[previousKey]);

  if (!previousValues.length) {
    return;
  }

  for (const previousValue of previousValues) {
    if (previousValue === primaryValue) {
      const message = `${previousKey} should not include the active ${primaryKey}`;
      if (nodeEnv === 'production') {
        issues.push(message);
      } else {
        warnings.push(message);
      }
      continue;
    }

    if (
      previousValue.length < 16 ||
      DEFAULT_WEAK_SECRETS.has(previousValue.toLowerCase())
    ) {
      const message = `${previousKey} contains weak secret material`;
      if (nodeEnv === 'production') {
        issues.push(message);
      } else {
        warnings.push(message);
      }
    }
  }
};

const validateCors = (issues) => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const origins = getAllowedCorsOrigins();

  if (nodeEnv === 'production' && origins.length === 0) {
    issues.push('CORS_ORIGIN must be set in production');
    return;
  }

  if (nodeEnv === 'production' && origins.includes('*')) {
    issues.push(
      'CORS_ORIGIN cannot be "*" in production when credentials are enabled'
    );
  }
};

const validateRealtimeCors = (issues) => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const realtimeEnabled = asBoolean(process.env.REALTIME_ENABLED);
  if (!realtimeEnabled) return;

  const socketOrigins = getSocketCorsOrigin();
  if (
    nodeEnv === 'production' &&
    (socketOrigins === '*' || socketOrigins === false)
  ) {
    issues.push(
      'SOCKET_CORS_ORIGIN/CORS_ORIGIN must be explicit in production when REALTIME_ENABLED=true'
    );
  }
};

const validateRateLimitRedis = (issues, nodeEnv) => {
  const enabled = asBoolean(process.env.RATE_LIMIT_REDIS_ENABLED);
  if (nodeEnv === 'production' && !enabled) {
    issues.push('RATE_LIMIT_REDIS_ENABLED must be true in production');
    return;
  }

  if (!enabled) return;

  const redisUrl = asString(
    process.env.RATE_LIMIT_REDIS_URL || process.env.REALTIME_REDIS_URL
  );
  if (!redisUrl) {
    issues.push(
      'RATE_LIMIT_REDIS_ENABLED=true requires RATE_LIMIT_REDIS_URL (or REALTIME_REDIS_URL)'
    );
  }
};

const validateRealtimeScaling = (issues, warnings, nodeEnv) => {
  const realtimeEnabled = asBoolean(process.env.REALTIME_ENABLED);
  const redisAdapterEnabled = asBoolean(process.env.REALTIME_REDIS_ENABLED);

  if (realtimeEnabled && nodeEnv === 'production' && !redisAdapterEnabled) {
    warnings.push(
      'REALTIME_ENABLED=true in production without REALTIME_REDIS_ENABLED=true may break multi-instance event fan-out'
    );
  }
};

const validateCookieSecurity = (issues, warnings, nodeEnv) => {
  const { useSecureCookies, sameSite } = getCookieSecurityProfile();
  if (sameSite === 'none' && !useSecureCookies) {
    issues.push('COOKIE_SAMESITE=none requires secure cookies');
  }

  if (nodeEnv === 'production' && !useSecureCookies) {
    issues.push('COOKIE_SECURE must be enabled in production');
  }
};

const validateErrorTracking = (issues) => {
  const provider = asString(process.env.ERROR_TRACKING_PROVIDER)
    .toLowerCase()
    .trim();

  if (!provider || provider === 'none') return;

  const allowedProviders = new Set(['none', 'webhook', 'sentry', 'both']);
  if (!allowedProviders.has(provider)) {
    issues.push(
      'ERROR_TRACKING_PROVIDER must be one of: none, webhook, sentry, both'
    );
    return;
  }

  const webhookUrl = asString(process.env.ERROR_TRACKING_WEBHOOK_URL);
  const sentryDsn = asString(process.env.ERROR_TRACKING_SENTRY_DSN);

  if (provider === 'webhook' || provider === 'both') {
    if (webhookUrl) return;

    if (asString(process.env.NODE_ENV || 'development') === 'production') {
      issues.push(
        'ERROR_TRACKING_PROVIDER requires ERROR_TRACKING_WEBHOOK_URL when provider includes webhook'
      );
    }
  }

  if ((provider === 'sentry' || provider === 'both') && !sentryDsn) {
    issues.push(
      'ERROR_TRACKING_PROVIDER requires ERROR_TRACKING_SENTRY_DSN when provider includes sentry'
    );
  }

  const sentrySampleRateRaw = asString(
    process.env.ERROR_TRACKING_SENTRY_TRACES_SAMPLE_RATE
  );
  if (sentrySampleRateRaw) {
    const sentrySampleRate = asNumber(sentrySampleRateRaw);
    if (
      sentrySampleRate == null ||
      sentrySampleRate < 0 ||
      sentrySampleRate > 1
    ) {
      issues.push(
        'ERROR_TRACKING_SENTRY_TRACES_SAMPLE_RATE must be a number between 0 and 1'
      );
    }
  }
};

const validateOpsAlerting = (issues) => {
  const webhook = asString(process.env.OPS_ALERT_WEBHOOK_URL);
  if (!webhook) return;

  if (!webhook.startsWith('http://') && !webhook.startsWith('https://')) {
    issues.push('OPS_ALERT_WEBHOOK_URL must start with http:// or https://');
  }

  const timeoutMs = asInteger(process.env.OPS_ALERT_WEBHOOK_TIMEOUT_MS);
  if (timeoutMs != null && (timeoutMs < 500 || timeoutMs > 20_000)) {
    issues.push('OPS_ALERT_WEBHOOK_TIMEOUT_MS must be between 500 and 20000');
  }

  const cooldownMs = asInteger(process.env.OPS_ALERT_COOLDOWN_MS);
  if (cooldownMs != null && (cooldownMs < 1000 || cooldownMs > 3_600_000)) {
    issues.push('OPS_ALERT_COOLDOWN_MS must be between 1000 and 3600000');
  }
};

const validateSmsConfig = (issues) => {
  const provider = asString(process.env.SMS_PROVIDER || 'none').toLowerCase();
  if (!['none', 'twilio'].includes(provider)) {
    issues.push('SMS_PROVIDER must be one of: none, twilio');
    return;
  }

  if (provider !== 'twilio') return;

  const requiredKeys = [
    'SMS_TWILIO_ACCOUNT_SID',
    'SMS_TWILIO_AUTH_TOKEN',
    'SMS_TWILIO_FROM'
  ];
  for (const key of requiredKeys) {
    if (!asString(process.env[key])) {
      issues.push(`${key} is required when SMS_PROVIDER=twilio`);
    }
  }

  const timeoutMs = asInteger(process.env.SMS_TIMEOUT_MS);
  if (timeoutMs != null && (timeoutMs < 500 || timeoutMs > 20_000)) {
    issues.push('SMS_TIMEOUT_MS must be between 500 and 20000');
  }
};

const validateBodyParserLimits = (issues) => {
  const jsonBodyMb = asNumber(process.env.MAX_JSON_BODY_MB);
  const formBodyMb = asNumber(process.env.MAX_FORM_BODY_MB);
  const formParamLimit = asInteger(process.env.MAX_FORM_PARAM_COUNT);

  if (jsonBodyMb != null && (jsonBodyMb <= 0 || jsonBodyMb > 20)) {
    issues.push('MAX_JSON_BODY_MB must be between 0 and 20');
  }

  if (formBodyMb != null && (formBodyMb <= 0 || formBodyMb > 20)) {
    issues.push('MAX_FORM_BODY_MB must be between 0 and 20');
  }

  if (
    formParamLimit != null &&
    (formParamLimit <= 0 || formParamLimit > 20_000)
  ) {
    issues.push('MAX_FORM_PARAM_COUNT must be between 1 and 20000');
  }
};

const validateHttpTimeouts = (issues) => {
  const requestTimeoutMs = asInteger(process.env.HTTP_REQUEST_TIMEOUT_MS);
  const headersTimeoutMs = asInteger(process.env.HTTP_HEADERS_TIMEOUT_MS);
  const keepAliveTimeoutMs = asInteger(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS);

  if (
    requestTimeoutMs != null &&
    (requestTimeoutMs < 1000 || requestTimeoutMs > 300_000)
  ) {
    issues.push('HTTP_REQUEST_TIMEOUT_MS must be between 1000 and 300000');
  }

  if (
    headersTimeoutMs != null &&
    (headersTimeoutMs < 1000 || headersTimeoutMs > 300_000)
  ) {
    issues.push('HTTP_HEADERS_TIMEOUT_MS must be between 1000 and 300000');
  }

  if (
    keepAliveTimeoutMs != null &&
    (keepAliveTimeoutMs < 1000 || keepAliveTimeoutMs > 120_000)
  ) {
    issues.push('HTTP_KEEP_ALIVE_TIMEOUT_MS must be between 1000 and 120000');
  }
};

const validateSocketEventRateLimit = (issues) => {
  const windowMs = asInteger(process.env.SOCKET_EVENT_WINDOW_MS);
  const maxEvents = asInteger(process.env.SOCKET_EVENT_MAX_EVENTS);
  const maxViolations = asInteger(process.env.SOCKET_EVENT_MAX_VIOLATIONS);

  if (windowMs != null && (windowMs < 100 || windowMs > 120_000)) {
    issues.push('SOCKET_EVENT_WINDOW_MS must be between 100 and 120000');
  }

  if (maxEvents != null && (maxEvents < 1 || maxEvents > 10_000)) {
    issues.push('SOCKET_EVENT_MAX_EVENTS must be between 1 and 10000');
  }

  if (maxViolations != null && (maxViolations < 1 || maxViolations > 100)) {
    issues.push('SOCKET_EVENT_MAX_VIOLATIONS must be between 1 and 100');
  }
};

const validateInventoryIntegrityConfig = (issues) => {
  const maxFindings = asInteger(process.env.INVENTORY_INTEGRITY_MAX_FINDINGS);
  const alertThreshold = asInteger(
    process.env.INVENTORY_INTEGRITY_ALERT_THRESHOLD
  );

  if (maxFindings != null && (maxFindings < 1 || maxFindings > 10_000)) {
    issues.push('INVENTORY_INTEGRITY_MAX_FINDINGS must be between 1 and 10000');
  }

  if (
    alertThreshold != null &&
    (alertThreshold < 1 || alertThreshold > 1_000_000)
  ) {
    issues.push(
      'INVENTORY_INTEGRITY_ALERT_THRESHOLD must be between 1 and 1000000'
    );
  }
};

const validateBackgroundQueueConfig = (issues, warnings, nodeEnv) => {
  const queueEnabled = asBoolean(process.env.BACKGROUND_JOB_QUEUE_ENABLED);
  if (!queueEnabled) return;

  const redisUrl = asString(
    process.env.BACKGROUND_JOB_REDIS_URL ||
      process.env.REALTIME_REDIS_URL ||
      process.env.RATE_LIMIT_REDIS_URL
  );
  if (!redisUrl) {
    issues.push(
      'BACKGROUND_JOB_QUEUE_ENABLED=true requires BACKGROUND_JOB_REDIS_URL (or REALTIME_REDIS_URL/RATE_LIMIT_REDIS_URL)'
    );
  }

  const concurrency = asInteger(process.env.BACKGROUND_JOB_WORKER_CONCURRENCY);
  if (concurrency != null && (concurrency < 1 || concurrency > 50)) {
    issues.push('BACKGROUND_JOB_WORKER_CONCURRENCY must be between 1 and 50');
  }

  const queueName = asString(process.env.BACKGROUND_JOB_QUEUE_NAME);
  if (queueName && queueName.length > 120) {
    issues.push('BACKGROUND_JOB_QUEUE_NAME must be 120 characters or fewer');
  }

  if (
    nodeEnv === 'production' &&
    asBoolean(process.env.BACKGROUND_JOB_RUN_INLINE_WORKER)
  ) {
    warnings.push(
      'BACKGROUND_JOB_RUN_INLINE_WORKER=true in production; run dedicated worker processes for better isolation'
    );
  }
};

const validateSubscriptionRateLimitConfig = (issues) => {
  const windowMs = asInteger(process.env.SUBSCRIPTION_RATE_LIMIT_WINDOW_MS);
  const fallbackLimit = asInteger(
    process.env.SUBSCRIPTION_RATE_LIMIT_FALLBACK_LIMIT
  );

  if (windowMs != null && (windowMs < 1000 || windowMs > 3_600_000)) {
    issues.push(
      'SUBSCRIPTION_RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000'
    );
  }

  if (
    fallbackLimit != null &&
    (fallbackLimit < 10 || fallbackLimit > 100_000)
  ) {
    issues.push(
      'SUBSCRIPTION_RATE_LIMIT_FALLBACK_LIMIT must be between 10 and 100000'
    );
  }
};

const validateApiCacheConfig = (issues) => {
  const defaultTtlMs = asInteger(process.env.API_QUERY_CACHE_DEFAULT_TTL_MS);
  const dashboardTtlMs = asInteger(process.env.DASHBOARD_CACHE_TTL_MS);
  const reportTtlMs = asInteger(process.env.REPORT_CACHE_TTL_MS);
  const forecastTtlMs = asInteger(process.env.FORECAST_CACHE_TTL_MS);

  const validators = [
    ['API_QUERY_CACHE_DEFAULT_TTL_MS', defaultTtlMs],
    ['DASHBOARD_CACHE_TTL_MS', dashboardTtlMs],
    ['REPORT_CACHE_TTL_MS', reportTtlMs],
    ['FORECAST_CACHE_TTL_MS', forecastTtlMs]
  ];

  for (const [key, value] of validators) {
    if (value == null) continue;
    if (value < 100 || value > 3_600_000) {
      issues.push(`${key} must be between 100 and 3600000`);
    }
  }
};

const validateFxProviderConfig = (issues) => {
  const template = asString(process.env.FX_PROVIDER_URL_TEMPLATE);
  if (template) {
    if (!template.startsWith('http://') && !template.startsWith('https://')) {
      issues.push(
        'FX_PROVIDER_URL_TEMPLATE must start with http:// or https://'
      );
    }

    if (!template.includes('{base}')) {
      issues.push('FX_PROVIDER_URL_TEMPLATE must include {base} placeholder');
    }
  }

  const timeoutMs = asInteger(process.env.FX_HTTP_TIMEOUT_MS);
  if (timeoutMs != null && (timeoutMs < 500 || timeoutMs > 20_000)) {
    issues.push('FX_HTTP_TIMEOUT_MS must be between 500 and 20000');
  }
};

const warnUnsafeFlags = () => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const authBypass = asBoolean(process.env.AUTH_TEST_BYPASS);
  if (nodeEnv !== 'test' && authBypass) {
    logger.warn('auth_test_bypass_enabled_outside_test', {
      nodeEnv
    });
  }
};

export const getRuntimeConfig = () => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const isProduction = nodeEnv === 'production';
  const enabled = (key, fallback = false) => {
    const raw = asString(process.env[key]);
    return raw ? asBoolean(raw) : fallback;
  };

  return Object.freeze({
    nodeEnv,
    isProduction,
    port: asInteger(process.env.PORT) || 4000,
    shutdownTimeoutMs: asInteger(process.env.SHUTDOWN_TIMEOUT_MS) || 15_000,
    httpLogger: asString(process.env.HTTP_LOGGER || 'morgan').toLowerCase(),
    scheduledJobsEnabled: !isProduction || enabled('RUN_SCHEDULED_JOBS'),
    realtimeEnabled: enabled('REALTIME_ENABLED'),
    realtimeRedis: Object.freeze({
      enabled: enabled('REALTIME_REDIS_ENABLED'),
      url: asString(process.env.REALTIME_REDIS_URL)
    }),
    rateLimitRedis: Object.freeze({
      enabled: enabled('RATE_LIMIT_REDIS_ENABLED'),
      url: asString(
        process.env.RATE_LIMIT_REDIS_URL || process.env.REALTIME_REDIS_URL
      ),
      prefix: asString(
        process.env.RATE_LIMIT_REDIS_PREFIX || 'invendex:rate-limit:'
      )
    }),
    backgroundJobs: Object.freeze({
      queueEnabled: enabled('BACKGROUND_JOB_QUEUE_ENABLED'),
      runInlineWorker: asString(process.env.BACKGROUND_JOB_RUN_INLINE_WORKER)
        ? enabled('BACKGROUND_JOB_RUN_INLINE_WORKER')
        : !isProduction,
      queueName: asString(
        process.env.BACKGROUND_JOB_QUEUE_NAME || 'invendex:background-jobs'
      ),
      redisUrl: asString(
        process.env.BACKGROUND_JOB_REDIS_URL ||
          process.env.REALTIME_REDIS_URL ||
          process.env.RATE_LIMIT_REDIS_URL
      ),
      workerConcurrency: Math.max(
        1,
        Math.min(
          asInteger(process.env.BACKGROUND_JOB_WORKER_CONCURRENCY) || 3,
          50
        )
      )
    }),
    auth: Object.freeze({
      testBypassEnabled: enabled('AUTH_TEST_BYPASS', true),
      requireEmailVerification: enabled('AUTH_REQUIRE_EMAIL_VERIFICATION'),
      appWebUrl: asString(process.env.APP_WEB_URL),
      accessTokenSecret: asString(process.env.JWT_ACCESS_SECRET),
      accessTokenPreviousSecrets: parseCsv(
        process.env.JWT_ACCESS_SECRET_PREVIOUS
      ),
      refreshTokenSecret: asString(process.env.JWT_REFRESH_SECRET),
      refreshTokenPreviousSecrets: parseCsv(
        process.env.JWT_REFRESH_SECRET_PREVIOUS
      ),
      accessTokenExpiresIn: asString(process.env.JWT_ACCESS_EXPIRES || '15m'),
      refreshTokenExpiresIn: asString(process.env.JWT_REFRESH_EXPIRES || '7d'),
      twoFactorChallengeTtlSeconds: Math.max(
        60,
        Math.min(
          asInteger(process.env.AUTH_2FA_CHALLENGE_TTL_SECONDS) || 600,
          3600
        )
      ),
      twoFactorIssuer: asString(
        process.env.AUTH_2FA_ISSUER || 'Invendex'
      ).slice(0, 80),
      twoFactorChallengeSecret: asString(process.env.AUTH_2FA_CHALLENGE_SECRET)
    }),
    notifications: Object.freeze({
      email: (() => {
        const host = asString(process.env.SMTP_HOST);
        const fromEmail = asString(process.env.SMTP_FROM_EMAIL);
        const port = Math.max(
          1,
          Math.min(asInteger(process.env.SMTP_PORT) || 587, 65_535)
        );
        const configured = Boolean(host && fromEmail);
        const toggle = asString(process.env.EMAIL_NOTIFICATIONS_ENABLED);
        return Object.freeze({
          host,
          port,
          secure: asString(process.env.SMTP_SECURE)
            ? asBoolean(process.env.SMTP_SECURE)
            : port === 465,
          requireTls: asBoolean(process.env.SMTP_REQUIRE_TLS),
          user: asString(process.env.SMTP_USER),
          pass: asString(process.env.SMTP_PASS),
          fromEmail,
          fromName: asString(process.env.SMTP_FROM_NAME || 'Invendex'),
          isConfigured: configured,
          isEnabled: toggle ? asBoolean(toggle) : configured
        });
      })(),
      sms: Object.freeze({
        provider: asString(process.env.SMS_PROVIDER || 'none').toLowerCase(),
        whatsappProvider: asString(
          process.env.WHATSAPP_PROVIDER || process.env.SMS_PROVIDER || 'none'
        ).toLowerCase(),
        timeoutMs: asInteger(process.env.SMS_TIMEOUT_MS) || 4000,
        lowStockRecipients: parseCsv(process.env.SMS_LOW_STOCK_RECIPIENTS),
        twilio: Object.freeze({
          accountSid: asString(process.env.SMS_TWILIO_ACCOUNT_SID),
          authToken: asString(process.env.SMS_TWILIO_AUTH_TOKEN),
          from: asString(process.env.SMS_TWILIO_FROM)
        }),
        whatsappTwilio: Object.freeze({
          accountSid: asString(
            process.env.WHATSAPP_TWILIO_ACCOUNT_SID ||
              process.env.SMS_TWILIO_ACCOUNT_SID
          ),
          authToken: asString(
            process.env.WHATSAPP_TWILIO_AUTH_TOKEN ||
              process.env.SMS_TWILIO_AUTH_TOKEN
          ),
          from: asString(
            process.env.WHATSAPP_TWILIO_FROM || process.env.SMS_TWILIO_FROM
          )
        })
      })
    }),
    observability: Object.freeze({
      logLevel: asString(process.env.LOG_LEVEL || 'info').toLowerCase(),
      metrics: Object.freeze({
        enabled: enabled('METRICS_ENABLED'),
        prefix: asString(process.env.METRICS_PREFIX || 'invendex_'),
        token: asString(process.env.METRICS_TOKEN)
      }),
      healthcheckDbTimeoutMs:
        asInteger(process.env.HEALTHCHECK_DB_TIMEOUT_MS) || 1000,
      operationalAlerts: Object.freeze({
        webhookUrl: asString(process.env.OPS_ALERT_WEBHOOK_URL),
        webhookTimeoutMs:
          asInteger(process.env.OPS_ALERT_WEBHOOK_TIMEOUT_MS) || 2000,
        cooldownMs: asInteger(process.env.OPS_ALERT_COOLDOWN_MS) || 60_000
      }),
      errorTracking: Object.freeze({
        provider: asString(
          process.env.ERROR_TRACKING_PROVIDER ||
            (process.env.ERROR_TRACKING_WEBHOOK_URL ? 'webhook' : 'none')
        ).toLowerCase(),
        webhookUrl: asString(process.env.ERROR_TRACKING_WEBHOOK_URL),
        sentryDsn: asString(process.env.ERROR_TRACKING_SENTRY_DSN),
        timeoutMs: asInteger(process.env.ERROR_TRACKING_TIMEOUT_MS) || 2000,
        sentryTracesSampleRate: Math.max(
          0,
          Math.min(
            asNumber(process.env.ERROR_TRACKING_SENTRY_TRACES_SAMPLE_RATE) || 0,
            1
          )
        )
      })
    }),
    apiDocsEnabled: !isProduction || enabled('API_DOCS_ENABLED'),
    legacyApi: Object.freeze({
      enabled: !isProduction || enabled('LEGACY_API_ENABLED'),
      sunset: asString(
        process.env.LEGACY_API_SUNSET || 'Thu, 31 Dec 2026 23:59:59 GMT'
      )
    })
  });
};

export const validateRuntimeEnv = () => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const issues = [];
  const warnings = [];
  validateDbUrl(issues);
  validatePreviousSecretChain(
    'JWT_ACCESS_SECRET',
    'JWT_ACCESS_SECRET_PREVIOUS',
    issues,
    warnings,
    nodeEnv
  );
  validatePreviousSecretChain(
    'JWT_REFRESH_SECRET',
    'JWT_REFRESH_SECRET_PREVIOUS',
    issues,
    warnings,
    nodeEnv
  );
  validateCors(issues);
  validateRealtimeCors(issues);
  validateRateLimitRedis(issues, nodeEnv);
  validateRealtimeScaling(issues, warnings, nodeEnv);
  validateCookieSecurity(issues, warnings, nodeEnv);
  validateErrorTracking(issues);
  validateOpsAlerting(issues);
  validateSmsConfig(issues);
  validateBodyParserLimits(issues);
  validateHttpTimeouts(issues);
  validateSocketEventRateLimit(issues);
  validateInventoryIntegrityConfig(issues);
  validateBackgroundQueueConfig(issues, warnings, nodeEnv);
  validateSubscriptionRateLimitConfig(issues);
  validateApiCacheConfig(issues);
  validateFxProviderConfig(issues);
  warnUnsafeFlags();

  if (warnings.length) {
    logger.warn('runtime_env_validation_warnings', {
      warnings
    });
  }

  if (issues.length) {
    throw new Error(`Runtime env validation failed:\n- ${issues.join('\n- ')}`);
  }
};

export default {
  getAllowedCorsOrigins,
  createCorsOriginValidator,
  getSocketCorsOrigin,
  getCookieSecurityProfile,
  getRefreshCookieOptions,
  getClearRefreshCookieOptions,
  getCsrfCookieOptions,
  getTrustProxySetting,
  getBodyParserConfig,
  getHttpServerTimeoutConfig,
  getRuntimeConfig,
  validateRuntimeEnv
};
