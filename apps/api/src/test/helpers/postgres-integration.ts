import { describe } from 'vitest';

/**
 * Returns true when POSTGRES_URL is set (local Docker or CI service).
 */
export function hasPostgresUrlEnv(): boolean {
  const raw = process.env.POSTGRES_URL;
  return raw !== undefined && raw.trim().length > 0;
}

/**
 * `describe` for Postgres KB integration suites; skips when POSTGRES_URL is unset.
 */
export const postgresDescribe = hasPostgresUrlEnv() ? describe : describe.skip;
