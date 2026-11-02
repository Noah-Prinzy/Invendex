import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
    DB_URL: z.string().min(1).default('mongodb://127.0.0.1:27017/invendex'),
    REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
    EVENTS_DRIVER: z.enum(['bullmq', 'memory']).default('bullmq'),
    JWT_ACCESS_SECRET: z
      .string()
      .default('dev-access-secret-change-me-0000000000'),
    JWT_REFRESH_SECRET: z
      .string()
      .default('dev-refresh-secret-change-me-0000000'),
    JWT_ACCESS_PREVIOUS_SECRETS: z.string().default(''),
    JWT_REFRESH_PREVIOUS_SECRETS: z.string().default(''),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    REQUIRE_EMAIL_VERIFICATION: z.enum(['true', 'false']).default('false'),
    AUTH_TEST_BYPASS: z.enum(['true', 'false']).default('false'),
    CORS_ORIGIN: z.string().default('*'),
    COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
    API_DOCS_ENABLED: z.enum(['true', 'false']).default('true'),
    AUDIT_LOG_TTL_DAYS: z.coerce.number().int().min(1).default(180),
    DEFAULT_LOCALE: z.string().default('en'),
    SUPPORTED_LOCALES: z.string().default('en,sw,fr,lg'),
    EFRIS_API_BASE_URL: z
      .string()
      .url()
      .default('https://apisandbox.ura.go.ug/efrisapi/v1'),
    EFRIS_API_KEY: z.string().default(''),
    MOBILE_MONEY_PROVIDER: z
      .enum(['aggregator', 'mtn', 'airtel'])
      .default('aggregator'),
    MOBILE_MONEY_AGGREGATOR_BASE_URL: z
      .string()
      .url()
      .default('https://api.flutterwave.com/v3'),
    MOBILE_MONEY_API_KEY: z.string().default(''),
    SMS_PROVIDER: z.enum(['none', 'africastalking', 'termii']).default('none'),
    SMS_API_KEY: z.string().default(''),
    WHATSAPP_PROVIDER: z.enum(['none', 'meta']).default('none'),
    WHATSAPP_ACCESS_TOKEN: z.string().default(''),
    WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
    USSD_PROVIDER: z.enum(['none', 'africastalking']).default('none'),
    USSD_SHORT_CODE: z.string().default('')
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'production' &&
      (env.JWT_ACCESS_SECRET.startsWith('dev-') ||
        env.JWT_REFRESH_SECRET.startsWith('dev-'))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message:
          'Production requires non-default JWT_ACCESS_SECRET / JWT_REFRESH_SECRET'
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;
