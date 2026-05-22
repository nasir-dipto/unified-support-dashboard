import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { SupportRole } from '@usd/shared-types';
import { ulid } from 'ulid';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

export type AuthTokenType = 'invite' | 'password_reset';

export type AuthTokenRecord = {
  orgId: string;
  tokenId: string;
  tokenType: AuthTokenType;
  email: string;
  expiresAt: string;
  usedAt?: string;
  invitedRole?: SupportRole;
  createdByUserId?: string;
  userId?: string;
};

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a one-time auth token (invite or password reset) with 24h expiry.
 */
export async function createAuthToken(params: {
  orgId: string;
  tokenType: AuthTokenType;
  email: string;
  invitedRole?: SupportRole;
  createdByUserId?: string;
  userId?: string;
}): Promise<{ tokenId: string; record: AuthTokenRecord }> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const tokenId = ulid();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const record: AuthTokenRecord = {
    orgId: params.orgId,
    tokenId,
    tokenType: params.tokenType,
    email: params.email.toLowerCase(),
    expiresAt,
    ...(params.invitedRole !== undefined ? { invitedRole: params.invitedRole } : {}),
    ...(params.createdByUserId !== undefined ? { createdByUserId: params.createdByUserId } : {}),
    ...(params.userId !== undefined ? { userId: params.userId } : {}),
  };
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_AUTH_TOKENS_TABLE,
      Item: record,
    }),
  );
  return { tokenId, record };
}

/**
 * Loads an auth token by org and token id (primary key).
 */
export async function getAuthToken(
  orgId: string,
  tokenId: string,
): Promise<AuthTokenRecord | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_AUTH_TOKENS_TABLE,
      Key: { orgId, tokenId },
    }),
  );
  return out.Item as AuthTokenRecord | undefined;
}

/**
 * Marks a token as used (one-time consumption).
 */
export async function markAuthTokenUsed(orgId: string, tokenId: string): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new UpdateCommand({
      TableName: env.SUPPORT_AUTH_TOKENS_TABLE,
      Key: { orgId, tokenId },
      UpdateExpression: 'SET usedAt = :u',
      ExpressionAttributeValues: { ':u': new Date().toISOString() },
    }),
  );
}
