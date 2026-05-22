import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('activity.handlers', () => {
  it('GET /api/activity/recent requires auth', async () => {
    const res = await request(createApp()).get('/api/activity/recent');
    expect(res.status).toBe(401);
  });
});
