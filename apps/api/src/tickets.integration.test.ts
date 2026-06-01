import { createHmac } from 'node:crypto';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  loginResponseSchema,
  ticketCommentsListResponseSchema,
  ticketDetailResponseSchema,
  ticketsListResponseSchema,
} from '@usd/shared-types';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv } from './config/loadEnv.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';
import { dynamoDescribe } from './test/helpers/dynamo-integration.js';

const INT_TEST_ORG = 'ti';

dynamoDescribe('tickets + webhook HTTP (DynamoDB Local)', () => {
  beforeAll(async () => {
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    if (endpoint === undefined) {
      return;
    }
    const client = new DynamoDBClient({
      endpoint,
      region: 'us-east-1',
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
    const env = getServerEnv();
    await ensureSupportTablesExist(
      client,
      env.SUPPORT_USERS_TABLE,
      env.SUPPORT_ROLES_TABLE,
      env.SUPPORT_TICKETS_TABLE,
      env.SUPPORT_TICKET_COMMENTS_TABLE,
    );
    const doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const hash = await bcrypt.hash('secret1234', 8);
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_USERS_TABLE,
        Item: {
          orgId: INT_TEST_ORG,
          userId: '01HZINTTICKUSER',
          email: 'tickets-int@example.com',
          passwordHash: hash,
          createdAt: new Date().toISOString(),
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: {
          orgId: INT_TEST_ORG,
          userId: '01HZINTTICKUSER',
          role: 'technician',
        },
      }),
    );
  });

  it('POST webhook upserts ticket and GET /api/tickets returns it', async () => {
    const app = createApp();
    const env = getServerEnv();
    const secret = env.JIRA_WEBHOOK_SECRET ?? 'test-webhook-secret';
    /** Compact JSON so signed bytes match what Supertest sends (no re-key ordering). */
    const payload =
      '{"webhookEvent":"jira:issue_updated","issue":{"key":"SUP-99","fields":{"summary":"Integration ticket","priority":{"name":"High"},"status":{"name":"In Progress"}}}}';
    const raw = Buffer.from(payload, 'utf8');
    const sig = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
    const wh = await request(app)
      .post('/api/webhooks/jira')
      .set('x-hub-signature-256', sig)
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(wh.status).toBe(202);

    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    expect(login.status).toBe(200);
    const tokens = loginResponseSchema.parse(login.body as unknown);

    const list = await request(app)
      .get('/api/tickets?limit=100')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(list.status).toBe(200);
    const listBody = ticketsListResponseSchema.parse(list.body);
    expect(listBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticketId: 'jira_SUP-99',
          externalId: 'SUP-99',
          summary: 'Integration ticket',
          source: 'jira',
        }),
      ]),
    );
  });

  it('GET /api/tickets/:id returns ticket', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const res = await request(app)
      .get('/api/tickets/jira_SUP-99')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    const detail = ticketDetailResponseSchema.parse(res.body);
    expect(detail.data.ticketId).toBe('jira_SUP-99');
  });

  it('rejects webhook without valid signature', async () => {
    const app = createApp();
    const raw = Buffer.from('{"issue":{"key":"X-1","fields":{}}}', 'utf8');
    const res = await request(app)
      .post('/api/webhooks/jira')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .set('Content-Type', 'application/json')
      .send(raw);
    expect(res.status).toBe(401);
  });

  it('rejects invalid tickets page', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const res = await request(app)
      .get('/api/tickets?page=0')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(400);
  });

  it('returns pagination and facets', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const res = await request(app)
      .get('/api/tickets?page=1&limit=5&sort=newest')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    const body = ticketsListResponseSchema.parse(res.body);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.facets.viewCounts.all).toBeGreaterThanOrEqual(body.data.length);
  });

  it('POST Helpdesk webhook upserts ticket and list includes it', async () => {
    const app = createApp();
    const env = getServerEnv();
    const wh = await request(app)
      .post('/api/webhooks/helpdesk')
      .set('x-sdp-webhook-secret', env.HD_WEBHOOK_SECRET ?? '')
      .send({
        request: {
          id: '4445000000190501',
          display_id: { value: '501', display_value: 'REQ-501' },
          subject: 'HD integration ticket',
          status: { name: 'On Hold' },
          priority: { name: 'High' },
          technician: { name: 'Agent Smith' },
          requester: { email_id: 'customer@example.com' },
        },
      });
    expect(wh.status).toBe(202);

    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    expect(login.status).toBe(200);
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const list = await request(app)
      .get('/api/tickets?limit=100')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(list.status).toBe(200);
    const listBody = ticketsListResponseSchema.parse(list.body);
    expect(listBody.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ticketId: 'hd_501',
          externalId: '501',
          internalId: '4445000000190501',
          source: 'helpdesk',
          summary: 'HD integration ticket',
          status: 'pending',
          customerEmail: 'customer@example.com',
        }),
      ]),
    );
  });

  it('rejects Helpdesk webhook without valid secret header', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/webhooks/helpdesk')
      .set('x-sdp-webhook-secret', 'nope')
      .send({ request: { id: '9', subject: 'x' } });
    expect(res.status).toBe(401);
  });

  it('GET /api/tickets/:id/comments returns an empty thread', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: 'tickets-int@example.com',
      password: 'secret1234',
    });
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const res = await request(app)
      .get('/api/tickets/jira_SUP-99/comments')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    const body = ticketCommentsListResponseSchema.parse(res.body);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});
