import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import type { HealthDetailResponse, HealthDependencyStatus } from '@usd/shared-types';
import { isHelpdeskEmailReplyEnabled } from '../config/helpdeskEmail.js';
import { getServerEnv } from '../config/loadEnv.js';
import { hasPostgresUrl, queryPostgres } from '../db/postgres.client.js';
import { pingRedis } from './redisPing.js';
import { getLocalWsConnectionCount } from './websocket.service.js';

/** API version reported by GET /api/health/detail. */
export const API_VERSION = '1.0.0';

/**
 * Probes DynamoDB with ListTables (never throws).
 */
export async function checkDynamoDbConnectivity(): Promise<HealthDependencyStatus> {
  try {
    const env = getServerEnv();
    const client = new DynamoDBClient({
      region: env.AWS_REGION,
      ...(env.DYNAMODB_ENDPOINT !== undefined ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),
    });
    await client.send(new ListTablesCommand({ Limit: 1 }));
    return 'connected';
  } catch {
    return 'error';
  }
}

/**
 * Probes Redis with PING when REDIS_URL is configured (never throws).
 */
export async function checkRedisConnectivity(): Promise<HealthDependencyStatus> {
  try {
    const env = getServerEnv();
    const url = env.REDIS_URL;
    if (url === undefined || url.trim().length === 0) {
      return 'error';
    }
    const ok = await pingRedis(url);
    return ok ? 'connected' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * Probes Postgres when POSTGRES_URL is set (never throws).
 */
export async function checkPostgresConnectivity(): Promise<HealthDependencyStatus> {
  try {
    if (!hasPostgresUrl()) {
      return 'error';
    }
    await queryPostgres('SELECT 1 AS ok');
    return 'connected';
  } catch {
    return 'error';
  }
}

/**
 * Builds the detailed health payload for GET /api/health/detail (never throws).
 */
export async function buildHealthDetail(): Promise<HealthDetailResponse> {
  const [dynamodb, redis, postgres] = await Promise.all([
    checkDynamoDbConnectivity(),
    checkRedisConnectivity(),
    checkPostgresConnectivity(),
  ]);
  const env = getServerEnv();
  const degraded = dynamodb === 'error' || redis === 'error';
  return {
    status: degraded ? 'degraded' : 'ok',
    version: API_VERSION,
    dynamodb,
    redis,
    postgres,
    websocket: { connections: getLocalWsConnectionCount() },
    helpdesk: { emailReplyEnabled: isHelpdeskEmailReplyEnabled(env) },
    uptime: Math.floor(process.uptime()),
  };
}
