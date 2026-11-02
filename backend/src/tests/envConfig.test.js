import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { jest } from '@jest/globals';
import { validateRuntimeEnv } from '../config/envConfig.js';
import { logger } from '../observability/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

describe('runtime env validation', () => {
  it('does not fail when webhook error tracking is configured without a URL', () => {
    const previousProvider = process.env.ERROR_TRACKING_PROVIDER;
    const previousWebhookUrl = process.env.ERROR_TRACKING_WEBHOOK_URL;

    process.env.ERROR_TRACKING_PROVIDER = 'webhook';
    process.env.ERROR_TRACKING_WEBHOOK_URL = '';

    try {
      expect(() => validateRuntimeEnv()).not.toThrow();
    } finally {
      process.env.ERROR_TRACKING_PROVIDER = previousProvider;
      process.env.ERROR_TRACKING_WEBHOOK_URL = previousWebhookUrl;
    }
  });

  it('does not warn about secure cookies in local development', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCookieSecure = process.env.COOKIE_SECURE;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SECURE = '';

    try {
      validateRuntimeEnv();
      expect(warnSpy).not.toHaveBeenCalledWith(
        'runtime_env_validation_warnings',
        expect.objectContaining({
          warnings: expect.arrayContaining([
            expect.stringContaining('COOKIE_SECURE')
          ])
        })
      );
    } finally {
      warnSpy.mockRestore();
      process.env.NODE_ENV = previousNodeEnv;
      process.env.COOKIE_SECURE = previousCookieSecure;
    }
  });
});
