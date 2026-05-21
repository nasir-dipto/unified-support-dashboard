import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyKbMigrations } from '../db/applyKbMigrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads `.env.local` from repo root and API package (same as db:setup).
 */
function loadLocalEnvFiles(): void {
  const apiRoot = join(__dirname, '..', '..');
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
}

/**
 * CLI entry: applies KB SQL migrations to Postgres (requires POSTGRES_URL).
 */
async function main(): Promise<void> {
  loadLocalEnvFiles();
  const url = process.env.POSTGRES_URL;
  if (url === undefined || url.trim().length === 0) {
    console.error('POSTGRES_URL is required for kb:migrate');
    process.exit(1);
  }
  await applyKbMigrations(url);
  console.log('KB migration applied successfully.');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
