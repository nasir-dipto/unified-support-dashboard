import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Applies KB SQL migrations to Postgres (idempotent; requires a valid connection string).
 */
export async function applyKbMigrations(connectionString: string): Promise<void> {
  const sqlPath = join(__dirname, 'migrations', '001_kb_articles.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
