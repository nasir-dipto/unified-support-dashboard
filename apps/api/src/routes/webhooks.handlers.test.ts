import { createHmac } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
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
    vi.spyOn(tickets, 'getTicketRecordOrUndefined').mockResolvedValue(undefined);
    const spy = vi.spyOn(tickets, 'upsertTicket').mockResolvedValue({
      ticketId: 'hd_12',
      orgId: 'org-int',
      source: 'helpdesk',
      externalId: '12',
      internalId: '777',
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
          display_id: { value: '12', display_value: '#12' },
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

  it('POST /api/webhooks/jira returns 200 and ignores project outside JIRA_INCLUDE_PROJECTS', async () => {
    const previous = process.env.JIRA_INCLUDE_PROJECTS;
    resetServerEnvForTests();
    process.env.JIRA_INCLUDE_PROJECTS = 'SCRUM';
    loadServerEnv();
    const spy = vi.spyOn(tickets, 'upsertTicket');
    const app = createApp();
    const env = getServerEnv();
    const secret = env.JIRA_WEBHOOK_SECRET ?? 'test-webhook-secret';
    const payload =
      '{"webhookEvent":"jira:issue_updated","issue":{"key":"TRL-99","fields":{"summary":"Ignored","priority":{"name":"High"},"status":{"name":"Open"}}}}';
    const raw = Buffer.from(payload, 'utf8');
    const sig = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
    const res = await request(app)
      .post('/api/webhooks/jira')
      .set('x-hub-signature-256', sig)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accepted: true, ignored: true });
    expect(spy).not.toHaveBeenCalled();
    resetServerEnvForTests();
    if (previous === undefined) {
      delete process.env.JIRA_INCLUDE_PROJECTS;
    } else {
      process.env.JIRA_INCLUDE_PROJECTS = previous;
    }
    loadServerEnv();
  });
});
