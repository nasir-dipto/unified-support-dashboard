import request from 'supertest';
import express from 'express';
import { describe, expect, it } from 'vitest';
import {
  createApiRateLimiter,
  rateLimitErrorBody,
  shouldSkipApiRateLimit,
} from './rate-limit.middleware.js';

describe('rate-limit.middleware', () => {
  it('shouldSkipApiRateLimit excludes health and webhooks', () => {
    expect(shouldSkipApiRateLimit('/api/health')).toBe(true);
    expect(shouldSkipApiRateLimit('/api/health/detail')).toBe(true);
    expect(shouldSkipApiRateLimit('/api/webhooks/jira')).toBe(true);
    expect(shouldSkipApiRateLimit('/api/tickets')).toBe(false);
  });

  it('rateLimitErrorBody matches API contract', () => {
    expect(rateLimitErrorBody()).toEqual({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      statusCode: 429,
    });
  });

  it('returns 429 when limit exceeded', async () => {
    const app = express();
    app.use(createApiRateLimiter({ windowMs: 60_000, max: 2 }));
    app.get('/api/test', (_req, res) => {
      res.json({ ok: true });
    });

    await request(app).get('/api/test').expect(200);
    await request(app).get('/api/test').expect(200);
    const res = await request(app).get('/api/test').expect(429);
    expect(res.body).toEqual(rateLimitErrorBody());
  });

  it('does not rate limit health detail path', async () => {
    const app = express();
    app.use(createApiRateLimiter({ windowMs: 60_000, max: 1 }));
    app.get('/api/health/detail', (_req, res) => {
      res.json({ status: 'ok' });
    });

    await request(app).get('/api/health/detail').expect(200);
    await request(app).get('/api/health/detail').expect(200);
  });
});
