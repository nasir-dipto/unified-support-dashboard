import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  /** Workspace packages export from dist/ — build @usd/shared-types before `vitest run --coverage`. */
  resolve: {
    alias: {
      '@usd/shared-types': resolve(__dirname, '../../packages/shared-types/dist/index.js'),
    },
  },
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
        '**/node_modules/**',
        '**/packages/**',
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
