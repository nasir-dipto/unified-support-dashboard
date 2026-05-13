import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('requireAuth middleware', () => {
  it('returns 401 without bearer token for /api/auth/me', async () => {
    const res = await request(createApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
    const body = res.body as { code?: string };
    expect(body.code).toBe('UNAUTHORIZED');
  });
});
