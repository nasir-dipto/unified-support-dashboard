import request from 'supertest';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  kbArticleSchema,
  kbSearchResponseSchema,
  loginResponseSchema,
} from '@usd/shared-types';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from './config/loadEnv.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';
import { postgresDescribe } from './test/helpers/postgres-integration.js';

const ORG = 'demo-org';
const EMAIL = 'kb-int@example.com';
const PASS = 'secret1234';
const TICKET_ID = 'hd_KBINT1';

const __dirname = dirname(fileURLToPath(import.meta.url));

postgresDescribe('KB API (Postgres + DynamoDB Local)', () => {
  beforeAll(async () => {
    const pgUrl = process.env.POSTGRES_URL;
    const ddb = process.env.DYNAMODB_ENDPOINT;
    if (pgUrl === undefined || ddb === undefined) {
      return;
    }
    process.env.USE_MOCK_AI = 'true';
    resetServerEnvForTests();
    loadServerEnv();

    const sql = readFileSync(
      join(__dirname, 'db/migrations/001_kb_articles.sql'),
      'utf8',
    );
    const client = new pg.Client({ connectionString: pgUrl });
    await client.connect();
    await client.query(sql);
    await client.end();

    const dynamo = new DynamoDBClient({
      endpoint: ddb,
      region: 'us-east-1',
      credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
    });
    const env = getServerEnv();
    await ensureSupportTablesExist(
      dynamo,
      env.SUPPORT_USERS_TABLE,
      env.SUPPORT_ROLES_TABLE,
      env.SUPPORT_TICKETS_TABLE,
      env.SUPPORT_TICKET_COMMENTS_TABLE,
    );
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
          userId: '01HZKBINTUSER',
          email: EMAIL,
          passwordHash: hash,
          createdAt: now,
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: { orgId: ORG, userId: '01HZKBINTUSER', role: 'admin' },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        Item: {
          ticketId: TICKET_ID,
          orgId: ORG,
          source: 'helpdesk',
          externalId: 'KBINT1',
          summary: 'Password reset loop',
          description: 'User cannot reset password',
          priority: 'medium',
          status: 'resolved',
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
  });

  async function adminToken(app: ReturnType<typeof createApp>): Promise<string> {
    const login = await request(app).post('/api/auth/login').send({
      orgId: ORG,
      email: EMAIL,
      password: PASS,
    });
    expect(login.status).toBe(200);
    return loginResponseSchema.parse(login.body as unknown).accessToken;
  }

  it('creates, publishes, and searches KB articles', async () => {
    const app = createApp();
    const token = await adminToken(app);

    const created = await request(app)
      .post('/api/kb')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Password reset',
        problem: 'Users stuck in loop',
        rootCause: 'Stale session cookie',
        resolutionSteps: 'Clear cookies and retry',
        tags: ['auth'],
        sourceTicketIds: [TICKET_ID],
      });
    expect(created.status).toBe(201);
    const article = kbArticleSchema.parse(
      (created.body as { data: unknown }).data,
    );

    const published = await request(app)
      .post(`/api/kb/${article.kbId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(published.status).toBe(200);
    expect(kbArticleSchema.parse((published.body as { data: unknown }).data).status).toBe(
      'published',
    );

    const search = await request(app)
      .post('/api/kb/search')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketId: TICKET_ID });
    expect(search.status).toBe(200);
    const results = kbSearchResponseSchema.parse(search.body);
    expect(results.data.length).toBeGreaterThan(0);
  });

  it('GET /api/kb?sourceTicketId filters drafts for any authenticated user', async () => {
    const app = createApp();
    const token = await adminToken(app);
    const created = await request(app)
      .post('/api/kb')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Filter test',
        problem: 'p',
        rootCause: 'r',
        resolutionSteps: 's',
        tags: [],
        sourceTicketIds: [TICKET_ID],
      });
    const kbId = kbArticleSchema.parse((created.body as { data: unknown }).data).kbId;

    const filtered = await request(app)
      .get('/api/kb')
      .query({ sourceTicketId: TICKET_ID, status: 'draft' })
      .set('Authorization', `Bearer ${token}`);
    expect(filtered.status).toBe(200);
    const list = (filtered.body as { data: { kbId: string }[] }).data;
    expect(list.some((a) => a.kbId === kbId)).toBe(true);

    await request(app)
      .delete(`/api/kb/${kbId}`)
      .set('Authorization', `Bearer ${token}`);
  });
});
