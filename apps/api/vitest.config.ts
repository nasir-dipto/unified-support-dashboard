import { defineConfig } from 'vitest/config';

/**
 * Vitest config loads after Turbo passes CI env vars; integration suites gate on DYNAMODB_ENDPOINT.
 */
export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['./src/test/setup-env.ts'],
    testTimeout: 30_000,
    env: {
      ...(process.env.DYNAMODB_ENDPOINT !== undefined &&
      process.env.DYNAMODB_ENDPOINT.trim().length > 0
        ? { DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT }
        : {}),
      ...(process.env.REDIS_URL !== undefined && process.env.REDIS_URL.trim().length > 0
        ? { REDIS_URL: process.env.REDIS_URL }
        : {}),
    },
  },
});
