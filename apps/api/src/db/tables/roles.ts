import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { SupportRole } from '@usd/shared-types';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

export type SupportRoleRecord = {
  orgId: string;
  userId: string;
  role: SupportRole;
};

/**
 * Returns the role assignment for a user in an org (primary key query includes orgId).
 */
export async function getSupportRole(
  orgId: string,
  userId: string,
): Promise<SupportRoleRecord | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_ROLES_TABLE,
      Key: { orgId, userId },
    }),
  );
  return out.Item as SupportRoleRecord | undefined;
}

/**
 * Creates or replaces the role assignment for a user in an org.
 */
export async function setSupportRole(
  orgId: string,
  userId: string,
  role: SupportRole,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_ROLES_TABLE,
      Item: { orgId, userId, role } satisfies SupportRoleRecord,
    }),
  );
}

/**
 * Deletes the role assignment for a user in an org.
 */
export async function deleteSupportRole(
  orgId: string,
  userId: string,
): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new DeleteCommand({
      TableName: env.SUPPORT_ROLES_TABLE,
      Key: { orgId, userId },
    }),
  );
}

/**
 * Lists all role assignments in an org (Query with orgId partition key).
 */
export async function listRolesByOrg(orgId: string): Promise<SupportRoleRecord[]> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_ROLES_TABLE,
      KeyConditionExpression: 'orgId = :o',
      ExpressionAttributeValues: { ':o': orgId },
    }),
  );
  return (out.Items ?? []) as SupportRoleRecord[];
}
