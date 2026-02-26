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
  return asString(process.env.NODE_ENV || 'development') === 'production';
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

const validateRateLimitRedis = (issues) => {
  if (!asBoolean(process.env.RATE_LIMIT_REDIS_ENABLED)) return;

  const redisUrl = asString(
    process.env.RATE_LIMIT_REDIS_URL || process.env.REALTIME_REDIS_URL
  );
  if (!redisUrl) {
    issues.push(
      'RATE_LIMIT_REDIS_ENABLED=true requires RATE_LIMIT_REDIS_URL (or REALTIME_REDIS_URL)'
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

  if (nodeEnv !== 'production' && !useSecureCookies) {
    warnings.push('COOKIE_SECURE is disabled outside production');
  }
};

const validateErrorTracking = (issues) => {
  const provider = asString(process.env.ERROR_TRACKING_PROVIDER)
    .toLowerCase()
    .trim();

  if (!provider) return;

  const allowedProviders = new Set(['none', 'webhook', 'sentry', 'both']);
  if (!allowedProviders.has(provider)) {
    issues.push(
      'ERROR_TRACKING_PROVIDER must be one of: none, webhook, sentry, both'
    );
    return;
  }

  if (
    (provider === 'webhook' || provider === 'both') &&
    !asString(process.env.ERROR_TRACKING_WEBHOOK_URL)
  ) {
    issues.push(
      'ERROR_TRACKING_PROVIDER requires ERROR_TRACKING_WEBHOOK_URL when provider includes webhook'
    );
  }

  if (
    (provider === 'sentry' || provider === 'both') &&
    !asString(process.env.ERROR_TRACKING_SENTRY_DSN)
  ) {
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

const warnUnsafeFlags = () => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const authBypass = asBoolean(process.env.AUTH_TEST_BYPASS);
  if (nodeEnv !== 'test' && authBypass) {
    logger.warn('auth_test_bypass_enabled_outside_test', {
      nodeEnv
    });
  }
};

export const validateRuntimeEnv = () => {
  const nodeEnv = asString(process.env.NODE_ENV || 'development');
  const issues = [];
  const warnings = [];
  validateDbUrl(issues);
  validateSecret('JWT_ACCESS_SECRET', issues, warnings, nodeEnv);
  validateSecret('JWT_REFRESH_SECRET', issues, warnings, nodeEnv);
  validateCors(issues);
  validateRealtimeCors(issues);
  validateRateLimitRedis(issues);
  validateCookieSecurity(issues, warnings, nodeEnv);
  validateErrorTracking(issues);
  validateBodyParserLimits(issues);
  validateHttpTimeouts(issues);
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
  validateRuntimeEnv
};
