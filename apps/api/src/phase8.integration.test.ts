import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { loginResponseSchema } from '@usd/shared-types';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from './config/loadEnv.js';
import { ensureAllUsdLocalDynamoTables } from './db/ensureUsdLocalDynamoTables.js';

const ORG = 'phase8-org';
const EMAIL = 'phase8@usd.dev';
const PASS = 'secret1234';

describe('Phase 8 API (DynamoDB Local)', () => {
  beforeAll(async () => {
    const ddb = process.env.DYNAMODB_ENDPOINT;
    if (ddb === undefined) {
      return;
    }
    resetServerEnvForTests();
    process.env.JIRA_DEFAULT_ORG_ID = ORG;
    process.env.HD_DEFAULT_ORG_ID = ORG;
    loadServerEnv();
    const dynamo = new DynamoDBClient({
      endpoint: ddb,
      region: 'us-east-1',
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
    await ensureAllUsdLocalDynamoTables(dynamo);
    const env = getServerEnv();
    const doc = DynamoDBDocumentClient.from(dynamo, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const hash = await bcrypt.hash(PASS, 8);
    const now = new Date().toISOString();
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_USERS_TABLE,
        Item: {
          orgId: ORG,
          userId: '01HZP8USER',
          email: EMAIL,
          passwordHash: hash,
          createdAt: now,
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: { orgId: ORG, userId: '01HZP8USER', role: 'admin' },
      }),
    );
    const ticketCreated = '2026-05-01T10:00:00.000Z';
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        Item: {
          ticketId: 'hd_P8',
          orgId: ORG,
          source: 'helpdesk',
          externalId: 'P8',
          summary: 'Phase 8 ticket',
          priority: 'medium',
          status: 'resolved',
          createdAt: ticketCreated,
          updatedAt: '2026-05-02T10:00:00.000Z',
        },
      }),
    );
  });

  async function token(app: ReturnType<typeof createApp>): Promise<string> {
    const login = await request(app).post('/api/auth/login').send({
      orgId: ORG,
      email: EMAIL,
      password: PASS,
    });
    expect(login.status).toBe(200);
    return loginResponseSchema.parse(login.body as unknown).accessToken;
  }

  it('GET /api/reports/volume returns trend data for admin', async () => {
    if (process.env.DYNAMODB_ENDPOINT === undefined) {
      return;
    }
    const app = createApp();
    const t = await token(app);
    const res = await request(app)
      .get('/api/reports/volume')
      .set('Authorization', `Bearer ${t}`)
      .query({ days: 7, format: 'json' });
    expect(res.status).toBe(200);
    const body = res.body as { data: { points: unknown[] } };
    expect(Array.isArray(body.data.points)).toBe(true);
  });

  it('GET /api/settings/sla and notifications CRUD', async () => {
    if (process.env.DYNAMODB_ENDPOINT === undefined) {
      return;
    }
    const app = createApp();
    const t = await token(app);
    const sla = await request(app)
      .get('/api/settings/sla')
      .set('Authorization', `Bearer ${t}`);
    expect(sla.status).toBe(200);
    expect(sla.body).toMatchObject({
      data: { critical: 2, high: 4, medium: 8, low: 24 },
    });

    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${t}`);
    expect(list.status).toBe(200);
    expect(list.body).toMatchObject({ data: [], unreadCount: 0 });
  });

  it('GET /api/tickets includes slaDueAt', async () => {
    if (process.env.DYNAMODB_ENDPOINT === undefined) {
      return;
    }
    const app = createApp();
    const t = await token(app);
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    const rows = (res.body as { data: { slaDueAt?: string }[] }).data;
    const row = rows.find((r) => r.slaDueAt !== undefined);
    expect(row?.slaDueAt).toBeDefined();
  });
});
