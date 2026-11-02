process.env.NODE_ENV = 'test';
process.env.PORT = '0';
// Placeholder only — test-app.ts overrides this with the in-memory server URI
// before the module compiles. Deliberately not 27017 (a real mongod may live there).
process.env.DB_URL = 'mongodb://127.0.0.1:27999/invendex_backend_v2_test';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.EVENTS_DRIVER = 'memory';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_123456789';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_123456789';
process.env.JWT_ACCESS_PREVIOUS_SECRETS = '';
process.env.JWT_REFRESH_PREVIOUS_SECRETS = '';
process.env.AUTH_TEST_BYPASS = 'false';
process.env.CORS_ORIGIN = '*';
process.env.COOKIE_SECURE = 'false';
process.env.API_DOCS_ENABLED = 'true';
process.env.AUDIT_LOG_TTL_DAYS = '180';
process.env.DEFAULT_LOCALE = 'en';
process.env.SUPPORTED_LOCALES = 'en,sw,fr,lg';
process.env.MONGOMS_VERSION = '7.0.14';
