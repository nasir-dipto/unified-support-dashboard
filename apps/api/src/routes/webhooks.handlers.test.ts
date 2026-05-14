import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { getServerEnv } from '../config/loadEnv.js';
import * as tickets from '../db/tables/tickets.js';

describe('webhooks.handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/webhooks/helpdesk rejects wrong x-sdp-webhook-secret', async () => {
    const app = createApp();
    const env = getServerEnv();
    const res = await request(app)
      .post('/api/webhooks/helpdesk')
      .set('x-sdp-webhook-secret', 'wrong')
      .send({ request: { id: '1', subject: 'x' } });
    expect(res.status).toBe(401);
    expect(env.HD_WEBHOOK_SECRET).toBeDefined();
  });

  it('POST /api/webhooks/helpdesk accepts valid secret and upserts', async () => {
    const spy = vi.spyOn(tickets, 'upsertTicket').mockResolvedValue({
      ticketId: 'hd_777',
      orgId: 'org-int',
      source: 'helpdesk',
      externalId: '777',
      summary: 'Webhook HD',
      priority: 'low',
      status: 'pending',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    const app = createApp();
    const env = getServerEnv();
    const res = await request(app)
      .post('/api/webhooks/helpdesk')
      .set('x-sdp-webhook-secret', env.HD_WEBHOOK_SECRET ?? '')
      .send({
        request: {
          id: '777',
          subject: 'Webhook HD',
          status: { name: 'On Hold' },
          priority: { name: 'Low' },
        },
      });
    expect(res.status).toBe(202);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.[0]?.status).toBe('pending');
    spy.mockRestore();
  });
});
