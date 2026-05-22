import request from 'supertest';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  loginResponseSchema,
  sentimentSummaryResponseSchema,
} from '@usd/shared-types';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv } from './config/loadEnv.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';
import { dynamoDescribe } from './test/helpers/dynamo-integration.js';

const ORG = 'demo-org';
const EMAIL = 'sentiment-int@example.com';
const PASS = 'secret1234';

dynamoDescribe('GET /api/sentiment/summary (DynamoDB Local)', () => {
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
    const hash = await bcrypt.hash(PASS, 8);
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_USERS_TABLE,
        Item: {
          orgId: ORG,
          userId: '01HZINTSENTUSER',
          email: EMAIL,
          passwordHash: hash,
          createdAt: new Date().toISOString(),
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: { orgId: ORG, userId: '01HZINTSENTUSER', role: 'manager' },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        Item: {
          ticketId: 'hd_SENT1',
          orgId: ORG,
          source: 'helpdesk',
          externalId: 'SENT1',
          summary: 'Frustrated customer',
          priority: 'high',
          status: 'open',
          customerEmail: 'user@acme.com',
          sentiment: 'negative',
          sentimentScore: -0.7,
          churnRisk: true,
          sentimentStale: false,
          sentimentAt: new Date().toISOString(),
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
        },
      }),
    );
  });

  it('returns sentiment summary for authenticated user', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: ORG,
      email: EMAIL,
      password: PASS,
    });
    const tokens = loginResponseSchema.parse(login.body as unknown);
    const res = await request(app)
      .get('/api/sentiment/summary')
      .set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    const body = sentimentSummaryResponseSchema.parse(res.body);
    expect(body.counts.negative).toBeGreaterThanOrEqual(1);
    expect(body.tickets.length).toBeGreaterThanOrEqual(1);
  });
});
