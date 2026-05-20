import { describe, expect, it, vi } from 'vitest';
import { fetchHealthDetail } from './health.js';

vi.mock('./client.js', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        status: 'ok',
        version: '1.0.0',
        dynamodb: 'connected',
        redis: 'connected',
        websocket: { connections: 0 },
        helpdesk: { emailReplyEnabled: false },
        uptime: 10,
      },
    }),
  },
}));

describe('fetchHealthDetail', () => {
  it('parses health response', async () => {
    const h = await fetchHealthDetail();
    expect(h.status).toBe('ok');
  });
});
