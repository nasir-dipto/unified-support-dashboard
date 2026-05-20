import request from 'supertest';
import { healthDetailResponseSchema } from '@usd/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import * as healthService from '../services/health.service.js';

describe('health.handlers', () => {
  it('GET /api/health/detail returns 200 when dependencies are healthy', async () => {
    vi.spyOn(healthService, 'buildHealthDetail').mockResolvedValue({
      status: 'ok',
      version: '1.0.0',
      dynamodb: 'connected',
      redis: 'connected',
      websocket: { connections: 0 },
      helpdesk: { emailReplyEnabled: false },
      uptime: 42,
    });
    const res = await request(createApp()).get('/api/health/detail');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      dynamodb: 'connected',
      redis: 'connected',
      websocket: { connections: 0 },
    });
    vi.restoreAllMocks();
  });

  it('GET /api/health/detail returns 503 when degraded', async () => {
    vi.spyOn(healthService, 'buildHealthDetail').mockResolvedValue({
      status: 'degraded',
      version: '1.0.0',
      dynamodb: 'error',
      redis: 'connected',
      websocket: { connections: 1 },
      helpdesk: { emailReplyEnabled: true },
      uptime: 10,
    });
    const res = await request(createApp()).get('/api/health/detail');
    expect(res.status).toBe(503);
    const body = healthDetailResponseSchema.parse(res.body);
    expect(body.status).toBe('degraded');
    vi.restoreAllMocks();
  });
});
