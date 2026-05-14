import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  /** Load `.env*` from monorepo root so `VITE_*` in root `.env.local` apply in dev and build. */
  envDir: resolve(__dirname, '../..'),
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
