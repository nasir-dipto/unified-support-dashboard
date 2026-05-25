import { defineConfig } from 'vitest/config';

/**
 * Vitest config loads after Turbo passes CI env vars; integration suites gate on DYNAMODB_ENDPOINT.
 */
/** Target coverage gates (enforced when COVERAGE_ENFORCE_THRESHOLDS=true). */
export const COVERAGE_TARGET_THRESHOLDS = {
  lines: 60,
  functions: 60,
  branches: 50,
} as const;

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    setupFiles: ['./src/test/setup-env.ts'],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/test/**',
        '**/scripts/**',
        '**/migrations/**',
      ],
      thresholds:
        process.env.COVERAGE_ENFORCE_THRESHOLDS === 'true'
          ? { ...COVERAGE_TARGET_THRESHOLDS, statements: COVERAGE_TARGET_THRESHOLDS.lines }
          : undefined,
    },
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
