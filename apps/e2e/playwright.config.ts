import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — Chromium only, videos on every test, HTML report.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './src/helpers/check-server.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: process.env.CI === 'true',
  retries: process.env.CI === 'true' ? 2 : 0,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
