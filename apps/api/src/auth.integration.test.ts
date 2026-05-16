import request from 'supertest';
import { loginResponseSchema, refreshResponseSchema } from '@usd/shared-types';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv } from './config/loadEnv.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';

const ddbDescribe = process.env.DYNAMODB_ENDPOINT ? describe : describe.skip;

ddbDescribe('auth HTTP (DynamoDB Local)', () => {
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
    );
    const doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
    const hash = await bcrypt.hash('secret1234', 8);
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_USERS_TABLE,
        Item: {
          orgId: 'demo-org',
          userId: '01HZINTTESTUSER',
          email: 'auth-int@example.com',
          passwordHash: hash,
          createdAt: new Date().toISOString(),
        },
      }),
    );
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_ROLES_TABLE,
        Item: {
          orgId: 'demo-org',
          userId: '01HZINTTESTUSER',
          role: 'viewer',
        },
      }),
    );
  });

  it('POST /api/auth/login returns tokens', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({
        orgId: 'demo-org',
        email: 'auth-int@example.com',
        password: 'secret1234',
      });
    expect(res.status).toBe(200);
    const body = loginResponseSchema.parse(res.body as unknown);
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.refreshToken.length).toBeGreaterThan(0);
    expect(body.user.userId).toBe('01HZINTTESTUSER');
  });

  it('POST /api/auth/refresh rotates tokens', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: 'org-int',
      email: 'auth-int@example.com',
      password: 'secret1234',
    });
    const loginBody = loginResponseSchema.parse(login.body as unknown);
    const refreshToken = loginBody.refreshToken;
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    const refreshed = refreshResponseSchema.parse(res.body as unknown);
    expect(refreshed.accessToken.length).toBeGreaterThan(0);
    expect(refreshed.refreshToken.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/logout clears refresh metadata', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: 'org-int',
      email: 'auth-int@example.com',
      password: 'secret1234',
    });
    const loginBody = loginResponseSchema.parse(login.body as unknown);
    const accessToken = loginBody.accessToken;
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(204);
  });

  it('POST stub forgot-password returns ok', async () => {
    const res = await request(createApp())
      .post('/api/auth/forgot-password')
      .send({ orgId: 'org-int', email: 'auth-int@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST stub reset-password returns ok', async () => {
    const res = await request(createApp())
      .post('/api/auth/reset-password')
      .send({ orgId: 'org-int', token: 'x', password: 'secret12345' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
