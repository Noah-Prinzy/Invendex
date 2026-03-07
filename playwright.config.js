const { defineConfig } = require('@playwright/test');

const FRONTEND_BASE_URL = process.env.E2E_FRONTEND_URL || 'http://127.0.0.1:3100';

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 90 * 1000,
  expect: {
    timeout: 15 * 1000
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: FRONTEND_BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev:e2e',
    url: FRONTEND_BASE_URL,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 240 * 1000
  }
});
