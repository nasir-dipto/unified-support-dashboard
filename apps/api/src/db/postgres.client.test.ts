import { afterEach, describe, expect, it } from 'vitest';
import { buildPostgresPoolConfig } from './postgres.client.js';

describe('buildPostgresPoolConfig', () => {
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('enables SSL in production', () => {
    process.env.NODE_ENV = 'production';
    const config = buildPostgresPoolConfig('postgresql://user:pass@rds.example.com:5432/usd_kb');
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('disables SSL in development', () => {
    process.env.NODE_ENV = 'development';
    const config = buildPostgresPoolConfig('postgresql://usd:usd@localhost:5432/usd_kb');
    expect(config.ssl).toBeUndefined();
  });

  it('disables SSL in test', () => {
    process.env.NODE_ENV = 'test';
    const config = buildPostgresPoolConfig('postgresql://usd:usd@localhost:5432/usd_kb');
    expect(config.ssl).toBeUndefined();
  });
});
