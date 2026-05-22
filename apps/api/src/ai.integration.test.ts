import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  commentDraftResponseSchema,
  kbDraftResponseSchema,
  loginResponseSchema,
  triageSuggestResponseSchema,
} from '@usd/shared-types';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv, resetServerEnvForTests, loadServerEnv } from './config/loadEnv.js';
import { resetDocumentClientForTests } from './db/dynamo.client.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';
import { dynamoDescribe } from './test/helpers/dynamo-integration.js';

const AI_INT_ORG = 'demo-org';
const AI_INT_EMAIL = 'ai-int@example.com';
const AI_INT_PASSWORD = 'secret1234';
const AI_TICKET_ID = 'jira_AI-INT-1';

dynamoDescribe('POST /api/ai/invoke (DynamoDB Local, USE_MOCK_AI)', () => {
  beforeAll(async () => {
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    if (endpoint === undefined) {
      return;
    }
    process.env.USE_MOCK_AI = 'true';
    resetServerEnvForTests();
    loadServerEnv();

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
    resetDocumentClientForTests();
    const doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const hash = await bcrypt.hash(AI_INT_PASSWORD, 8);
    const now = new Date().toISOString();
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_USERS_TABLE,
        Item: {
          orgId: AI_INT_ORG,
          userId: '01HZINTAIUSER',
          email: AI_INT_EMAIL,
          passwordHash: hash,
          createdAt: now,
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: { orgId: AI_INT_ORG, userId: '01HZINTAIUSER', role: 'technician' },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        Item: {
          ticketId: AI_TICKET_ID,
          orgId: AI_INT_ORG,
          source: 'jira',
          externalId: 'AI-INT-1',
          summary: 'AI integration ticket',
          priority: 'high',
          status: 'open',
          assigneeId: AI_INT_EMAIL,
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
  });

  async function bearerToken(app: ReturnType<typeof createApp>): Promise<string> {
    const login = await request(app).post('/api/auth/login').send({
      orgId: AI_INT_ORG,
      email: AI_INT_EMAIL,
      password: AI_INT_PASSWORD,
    });
    expect(login.status).toBe(200);
    const tokens = loginResponseSchema.parse(login.body as unknown);
    return tokens.accessToken;
  }

  it('returns mock triage_suggest for existing ticket', async () => {
    const app = createApp();
    const token = await bearerToken(app);
    const res = await request(app)
      .post('/api/ai/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ feature: 'triage_suggest', ticketId: AI_TICKET_ID });
    expect(res.status).toBe(200);
    const body = triageSuggestResponseSchema.parse(res.body);
    expect(body.engineerAction).toContain('AI-INT-1');
    expect(body.riskLevel).toBe('HIGH');
  });

  it('returns mock comment_draft with tone', async () => {
    const app = createApp();
    const token = await bearerToken(app);
    const res = await request(app)
      .post('/api/ai/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ feature: 'comment_draft', ticketId: AI_TICKET_ID, tone: 'empathetic' });
    expect(res.status).toBe(200);
    const body = commentDraftResponseSchema.parse(res.body);
    expect(body.tone).toBe('empathetic');
    expect(body.draft.length).toBeGreaterThan(20);
  });

  it('returns mock kb_draft for existing ticket', async () => {
    const app = createApp();
    const token = await bearerToken(app);
    const res = await request(app)
      .post('/api/ai/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ feature: 'kb_draft', ticketId: AI_TICKET_ID });
    expect(res.status).toBe(200);
    const body = kbDraftResponseSchema.parse(res.body);
    expect(body.title.length).toBeGreaterThan(0);
    expect(body.sourceTicketIds).toContain(AI_TICKET_ID);
  });

  it('rejects unauthenticated invoke', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/ai/invoke')
      .send({ feature: 'triage_suggest', ticketId: AI_TICKET_ID });
    expect(res.status).toBe(401);
  });
});
