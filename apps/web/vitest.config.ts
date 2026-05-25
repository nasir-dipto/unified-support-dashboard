import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Target coverage gates (enforced when COVERAGE_ENFORCE_THRESHOLDS=true). */
export const COVERAGE_TARGET_THRESHOLDS = {
  lines: 60,
  functions: 60,
  branches: 50,
} as const;

export default defineConfig({
  plugins: [react()],
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
      ],
      thresholds:
        process.env.COVERAGE_ENFORCE_THRESHOLDS === 'true'
          ? { ...COVERAGE_TARGET_THRESHOLDS, statements: COVERAGE_TARGET_THRESHOLDS.lines }
          : undefined,
    },
  },
});
