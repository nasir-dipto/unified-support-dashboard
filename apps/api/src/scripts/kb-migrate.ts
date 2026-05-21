import { config as loadEnvFile } from 'dotenv';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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
 * Applies KB SQL migrations to Postgres (requires POSTGRES_URL).
 */
async function main(): Promise<void> {
  loadLocalEnvFiles();
  const url = process.env.POSTGRES_URL;
  if (url === undefined || url.trim().length === 0) {
    console.error('POSTGRES_URL is required for kb:migrate');
    process.exit(1);
  }
  const sqlPath = join(__dirname, '../db/migrations/001_kb_articles.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('KB migration applied successfully.');
  } finally {
    await client.end();
  }
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
