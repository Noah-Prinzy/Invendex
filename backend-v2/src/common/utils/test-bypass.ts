/**
 * Parity with the legacy test bypass: when NODE_ENV=test, protected routes may
 * be auto-authenticated as an admin (legacy default AUTH_TEST_BYPASS=true).
 */
export const isTestBypassEnabled = (): boolean =>
  process.env.NODE_ENV === 'test' &&
  (process.env.AUTH_TEST_BYPASS ?? 'true') === 'true';
