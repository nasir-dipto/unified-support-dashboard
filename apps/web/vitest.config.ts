import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Target coverage gates (enforced when COVERAGE_ENFORCE_THRESHOLDS=true). */
export const COVERAGE_TARGET_THRESHOLDS = {
  lines: 60,
  functions: 60,
  branches: 50,
} as const;

export default defineConfig({
  plugins: [react()],
  /** Workspace packages export from dist/ — build @usd/shared-types and @usd/ui before `vitest run --coverage`. */
  resolve: {
    alias: {
      '@usd/shared-types': resolve(__dirname, '../../packages/shared-types/dist/index.js'),
      '@usd/ui': resolve(__dirname, '../../packages/ui/dist/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
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
  },
});
