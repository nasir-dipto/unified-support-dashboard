import request from 'supertest';
import { loginResponseSchema, refreshResponseSchema } from '@usd/shared-types';
import bcrypt from 'bcryptjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeAll, expect, it } from 'vitest';
import { createApp } from './app.js';
import { getServerEnv } from './config/loadEnv.js';
import { getDocumentClient, resetDocumentClientForTests } from './db/dynamo.client.js';
import { setSupportRole } from './db/tables/roles.js';
import { createUser, getUserByEmail } from './db/tables/users.js';
import { ensureSupportTablesExist } from './test/helpers/create-tables.js';
import { dynamoDescribe } from './test/helpers/dynamo-integration.js';

const INT_TEST_ORG = 'demo-org';
const INT_TEST_EMAIL = 'auth-int@example.com';
const INT_TEST_PASSWORD = 'secret1234';

let intTestUserId: string;

dynamoDescribe('auth HTTP (DynamoDB Local)', () => {
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
    resetDocumentClientForTests();
    const passwordHash = await bcrypt.hash(INT_TEST_PASSWORD, 8);
    const existing = await getUserByEmail(INT_TEST_ORG, INT_TEST_EMAIL);
    if (existing !== undefined) {
      intTestUserId = existing.userId;
      const doc = getDocumentClient();
      await doc.send(
        new UpdateCommand({
          TableName: env.SUPPORT_USERS_TABLE,
          Key: { orgId: INT_TEST_ORG, userId: existing.userId },
          UpdateExpression: 'SET passwordHash = :p',
          ExpressionAttributeValues: { ':p': passwordHash },
        }),
      );
    } else {
      const user = await createUser({
        orgId: INT_TEST_ORG,
        email: INT_TEST_EMAIL,
        passwordHash,
      });
      intTestUserId = user.userId;
    }
    await setSupportRole(INT_TEST_ORG, intTestUserId, 'viewer');
  });

  it('POST /api/auth/login returns tokens', async () => {
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({
        orgId: INT_TEST_ORG,
        email: INT_TEST_EMAIL,
        password: INT_TEST_PASSWORD,
      });
    expect(res.status).toBe(200);
    const body = loginResponseSchema.parse(res.body as unknown);
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body.refreshToken.length).toBeGreaterThan(0);
    expect(body.user.userId).toBe(intTestUserId);
  });

  it('POST /api/auth/refresh rotates tokens', async () => {
    const app = createApp();
    const login = await request(app).post('/api/auth/login').send({
      orgId: INT_TEST_ORG,
      email: INT_TEST_EMAIL,
      password: INT_TEST_PASSWORD,
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
      orgId: INT_TEST_ORG,
      email: INT_TEST_EMAIL,
      password: INT_TEST_PASSWORD,
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
      .send({ orgId: INT_TEST_ORG, email: INT_TEST_EMAIL });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST stub reset-password returns ok', async () => {
    const res = await request(createApp())
      .post('/api/auth/reset-password')
      .send({
        orgId: INT_TEST_ORG,
        token: 'x',
        password: 'secret12345',
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
