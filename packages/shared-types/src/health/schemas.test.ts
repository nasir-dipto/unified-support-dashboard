import { describe, expect, it } from 'vitest';
import { healthDetailResponseSchema } from './schemas.js';

describe('healthDetailResponseSchema', () => {
  it('parses a valid health detail payload', () => {
    const parsed = healthDetailResponseSchema.parse({
      status: 'ok',
      version: '1.0.0',
      dynamodb: 'connected',
      redis: 'connected',
      websocket: { connections: 2 },
      uptime: 120,
    });
    expect(parsed.status).toBe('ok');
  });
});
