import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { buildHealthDetail, checkDynamoDbConnectivity, checkRedisConnectivity } from './health.service.js';
import * as redisPing from './redisPing.js';

vi.mock('@aws-sdk/client-dynamodb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-dynamodb')>();
  return {
    ...actual,
    DynamoDBClient: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  };
});

describe('health.service', () => {
  beforeEach(() => {
    resetServerEnvForTests();
    process.env.AWS_REGION = 'us-east-1';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    loadServerEnv();
    vi.restoreAllMocks();
  });

  it('checkDynamoDbConnectivity returns connected when ListTables succeeds', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const send = vi.fn().mockResolvedValue({ TableNames: [] });
    vi.mocked(DynamoDBClient).mockImplementation(
      () =>
        ({
          send,
        }) as unknown as InstanceType<typeof DynamoDBClient>,
    );
    await expect(checkDynamoDbConnectivity()).resolves.toBe('connected');
    expect(send).toHaveBeenCalledWith(expect.any(ListTablesCommand));
  });

  it('checkDynamoDbConnectivity returns error when ListTables fails', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    vi.mocked(DynamoDBClient).mockImplementation(
      () =>
        ({
          send: vi.fn().mockRejectedValue(new Error('down')),
        }) as unknown as InstanceType<typeof DynamoDBClient>,
    );
    await expect(checkDynamoDbConnectivity()).resolves.toBe('error');
  });

  it('checkRedisConnectivity returns connected when PING succeeds', async () => {
    vi.spyOn(redisPing, 'pingRedis').mockResolvedValue(true);
    await expect(checkRedisConnectivity()).resolves.toBe('connected');
  });

  it('checkRedisConnectivity returns error when REDIS_URL is unset', async () => {
    resetServerEnvForTests();
    delete process.env.REDIS_URL;
    loadServerEnv();
    await expect(checkRedisConnectivity()).resolves.toBe('error');
  });

  it('buildHealthDetail marks status degraded when a dependency fails', async () => {
    vi.spyOn(redisPing, 'pingRedis').mockResolvedValue(false);
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    vi.mocked(DynamoDBClient).mockImplementation(
      () =>
        ({
          send: vi.fn().mockResolvedValue({ TableNames: [] }),
        }) as unknown as InstanceType<typeof DynamoDBClient>,
    );
    const detail = await buildHealthDetail();
    expect(detail.status).toBe('degraded');
    expect(detail.redis).toBe('error');
    expect(detail.dynamodb).toBe('connected');
    expect(detail.helpdesk.emailReplyEnabled).toBe(false);
  });

  it('buildHealthDetail reflects HELPDESK_EMAIL_REPLY_ENABLED', async () => {
    resetServerEnvForTests();
    process.env.AWS_REGION = 'us-east-1';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.HELPDESK_EMAIL_REPLY_ENABLED = 'true';
    loadServerEnv();
    vi.spyOn(redisPing, 'pingRedis').mockResolvedValue(true);
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    vi.mocked(DynamoDBClient).mockImplementation(
      () =>
        ({
          send: vi.fn().mockResolvedValue({ TableNames: [] }),
        }) as unknown as InstanceType<typeof DynamoDBClient>,
    );
    const detail = await buildHealthDetail();
    expect(detail.helpdesk.emailReplyEnabled).toBe(true);
  });
});
