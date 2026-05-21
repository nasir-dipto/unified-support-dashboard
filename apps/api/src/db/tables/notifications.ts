import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import {
  notificationRecordSchema,
  type NotificationApiDto,
  type NotificationRecord,
  type NotificationType,
} from '@usd/shared-types';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

export type CreateNotificationParams = {
  orgId: string;
  type: NotificationType;
  title: string;
  message: string;
  ticketId?: string;
  recipientUserId?: string;
  recipientEmail?: string;
};

/**
 * Inserts a notification row for an org.
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<NotificationRecord> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const now = new Date().toISOString();
  const record = notificationRecordSchema.parse({
    notificationId: ulid(),
    orgId: params.orgId,
    type: params.type,
    title: params.title,
    message: params.message,
    ticketId: params.ticketId,
    recipientUserId: params.recipientUserId,
    recipientEmail: params.recipientEmail,
    readAt: null,
    createdAt: now,
  });
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_NOTIFICATIONS_TABLE,
      Item: record,
    }),
  );
  return record;
}

/**
 * Lists notifications for an org (newest first).
 */
export async function listNotifications(orgId: string): Promise<{
  items: NotificationApiDto[];
  unreadCount: number;
}> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const items: NotificationApiDto[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await doc.send(
      new QueryCommand({
        TableName: env.SUPPORT_NOTIFICATIONS_TABLE,
        KeyConditionExpression: 'orgId = :o',
        ExpressionAttributeValues: { ':o': orgId },
        ScanIndexForward: false,
        ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of out.Items ?? []) {
      const parsed = notificationRecordSchema.safeParse(raw);
      if (parsed.success) {
        items.push(parsed.data);
      }
    }
    exclusiveStartKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey !== undefined);

  const unreadCount = items.filter((n) => n.readAt === undefined || n.readAt === null).length;
  return { items, unreadCount };
}

/**
 * Marks a notification as read when it belongs to the org.
 */
export async function markNotificationRead(
  orgId: string,
  notificationId: string,
): Promise<NotificationApiDto | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const now = new Date().toISOString();
  try {
    const out = await doc.send(
      new UpdateCommand({
        TableName: env.SUPPORT_NOTIFICATIONS_TABLE,
        Key: { orgId, notificationId },
        UpdateExpression: 'SET readAt = :r',
        ConditionExpression: 'orgId = :o',
        ExpressionAttributeValues: { ':r': now, ':o': orgId },
        ReturnValues: 'ALL_NEW',
      }),
    );
    const parsed = notificationRecordSchema.safeParse(out.Attributes);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
