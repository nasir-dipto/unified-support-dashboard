import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/cdk.out/**',
    ],
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/playwright.config.ts',
      '**/tailwind.config.ts',
      '**/postcss.config.js',
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
