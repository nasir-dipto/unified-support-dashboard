import pg from 'pg';
import { getServerEnv } from '../config/loadEnv.js';

let pool: pg.Pool | undefined;

/**
 * Pool options: SSL enabled in production for RDS; disabled for local Docker.
 */
export function buildPostgresPoolConfig(connectionString: string): pg.PoolConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'production') {
    return {
      connectionString,
      ssl: { rejectUnauthorized: false },
    };
  }
  return { connectionString };
}

/**
 * Returns true when POSTGRES_URL is configured.
 */
export function hasPostgresUrl(): boolean {
  const url = getServerEnv().POSTGRES_URL;
  return url !== undefined && url.trim().length > 0;
}

/**
 * Lazily creates a shared pg Pool (null when POSTGRES_URL is unset).
 */
export function getPostgresPool(): pg.Pool | null {
  if (!hasPostgresUrl()) {
    return null;
  }
  if (pool === undefined) {
    const env = getServerEnv();
    pool = new pg.Pool(buildPostgresPoolConfig(env.POSTGRES_URL ?? ''));
  }
  return pool;
}

/**
 * Runs a parameterized query against Postgres (throws when URL unset).
 */
export async function queryPostgres<T extends pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const p = getPostgresPool();
  if (p === null) {
    throw new Error('POSTGRES_URL is not configured');
  }
  const result = await p.query<T>(sql, params);
  return result.rows;
}

/**
 * Closes the pool (graceful shutdown and tests).
 */
export async function closePostgresPool(): Promise<void> {
  if (pool !== undefined) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * Closes the pool (Vitest teardown alias).
 */
export async function resetPostgresPoolForTests(): Promise<void> {
  await closePostgresPool();
}
