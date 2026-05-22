import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

const USERS_EMAIL_GSI = 'orgId-email';

export type SupportUserRecord = {
  orgId: string;
  userId: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  refreshJti?: string;
  refreshExp?: number;
  createdAt: string;
};

/**
 * Loads a user by primary key (orgId + userId).
 */
export async function getUserById(
  orgId: string,
  userId: string,
): Promise<SupportUserRecord | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Key: { orgId, userId },
    }),
  );
  return out.Item as SupportUserRecord | undefined;
}

/**
 * Loads a user by org + email using the orgId-email GSI (KeyCondition includes orgId).
 */
export async function getUserByEmail(
  orgId: string,
  email: string,
): Promise<SupportUserRecord | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      IndexName: USERS_EMAIL_GSI,
      KeyConditionExpression: 'orgId = :o AND email = :e',
      ExpressionAttributeValues: {
        ':o': orgId,
        ':e': email.toLowerCase(),
      },
      Limit: 1,
    }),
  );
  const first = out.Items?.[0];
  return first !== undefined ? (first as SupportUserRecord) : undefined;
}

export type CreateUserInput = {
  orgId: string;
  email: string;
  passwordHash: string;
};

/**
 * Creates a new user with a generated ULID userId under the given org.
 */
export async function createUser(input: CreateUserInput): Promise<SupportUserRecord> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const userId = ulid();
  const createdAt = new Date().toISOString();
  const record: SupportUserRecord = {
    orgId: input.orgId,
    userId,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    createdAt,
  };
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Item: record,
    }),
  );
  return record;
}

/**
 * Persists refresh token metadata for rotation / logout.
 */
export async function setUserRefreshMetadata(
  orgId: string,
  userId: string,
  jti: string,
  exp: number,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new UpdateCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Key: { orgId, userId },
      UpdateExpression: 'SET refreshJti = :j, refreshExp = :x',
      ExpressionAttributeValues: {
        ':j': jti,
        ':x': exp,
      },
    }),
  );
}

/**
 * Clears refresh metadata on logout.
 */
export async function clearUserRefreshMetadata(
  orgId: string,
  userId: string,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new UpdateCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Key: { orgId, userId },
      UpdateExpression: 'REMOVE refreshJti, refreshExp',
    }),
  );
}

/**
 * Lists all users in an org (Query with orgId partition key).
 */
export async function listUsersByOrg(orgId: string): Promise<SupportUserRecord[]> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      KeyConditionExpression: 'orgId = :o',
      ExpressionAttributeValues: { ':o': orgId },
    }),
  );
  return (out.Items ?? []) as SupportUserRecord[];
}

/**
 * Updates a user's display name (used for ticket assignee matching).
 */
export async function updateUserDisplayName(
  orgId: string,
  userId: string,
  displayName: string,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new UpdateCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Key: { orgId, userId },
      UpdateExpression: 'SET displayName = :n',
      ExpressionAttributeValues: { ':n': displayName.trim() },
    }),
  );
}

/**
 * Updates a user's password hash after reset or invite acceptance.
 */
export async function updatePasswordHash(
  orgId: string,
  userId: string,
  passwordHash: string,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new UpdateCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Key: { orgId, userId },
      UpdateExpression: 'SET passwordHash = :p',
      ExpressionAttributeValues: { ':p': passwordHash },
    }),
  );
}

/**
 * Creates a user without a password (pending invite acceptance).
 */
export async function createUserPendingInvite(input: {
  orgId: string;
  email: string;
}): Promise<SupportUserRecord> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const userId = ulid();
  const createdAt = new Date().toISOString();
  const record: SupportUserRecord = {
    orgId: input.orgId,
    userId,
    email: input.email.toLowerCase(),
    passwordHash: '',
    createdAt,
  };
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_USERS_TABLE,
      Item: record,
    }),
  );
  return record;
}
