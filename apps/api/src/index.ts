import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ensureDevJwtKeys } from './config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv } from './config/loadEnv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads `.env.local` from the monorepo root and the API package (missing files are ignored).
 * Package-level values override root when the same key is defined in both files.
 */
function loadLocalDotenv(): void {
  const apiRoot = join(__dirname, '..');
  const repoRoot = join(__dirname, '../../..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
}

loadLocalDotenv();
ensureDevJwtKeys();
loadServerEnv();
const app = createApp();
const env = getServerEnv();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${String(env.PORT)}`);
});
