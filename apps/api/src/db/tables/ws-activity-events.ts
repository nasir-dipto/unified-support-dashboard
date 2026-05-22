import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { WsOutboundEnvelope } from '@usd/shared-types';
import { wsOutboundEnvelopeSchema } from '@usd/shared-types';
import { ulid } from 'ulid';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

const TTL_DAYS = 7;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

type WsActivityEventRecord = {
  orgId: string;
  eventId: string;
  type: WsOutboundEnvelope['type'];
  ticketId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt: number;
};

/**
 * Computes DynamoDB TTL epoch seconds (7 days from now).
 */
export function computeWsActivityExpiresAt(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000) + TTL_SECONDS;
}

/**
 * Persists a WebSocket activity event for later ActivitySidebar history (7-day TTL).
 */
export async function putWsActivityEvent(envelope: WsOutboundEnvelope): Promise<void> {
  const parsed = wsOutboundEnvelopeSchema.parse(envelope);
  const env = getServerEnv();
  const doc = getDocumentClient();
  const eventId = ulid();
  const createdAt = new Date().toISOString();
  const record: WsActivityEventRecord = {
    orgId: parsed.orgId,
    eventId,
    type: parsed.type,
    ticketId: parsed.ticketId,
    payload: parsed.payload,
    createdAt,
    expiresAt: computeWsActivityExpiresAt(),
  };
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_WS_ACTIVITY_TABLE,
      Item: record,
    }),
  );
}

/**
 * Lists the most recent WebSocket activity events for an org (newest first).
 */
export async function listRecentWsActivityEvents(
  orgId: string,
  limit: number,
): Promise<WsOutboundEnvelope[]> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_WS_ACTIVITY_TABLE,
      KeyConditionExpression: 'orgId = :o',
      ExpressionAttributeValues: { ':o': orgId },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  const items = (out.Items ?? []) as WsActivityEventRecord[];
  return items.map((row) =>
    wsOutboundEnvelopeSchema.parse({
      type: row.type,
      ticketId: row.ticketId,
      orgId: row.orgId,
      payload: row.payload,
    }),
  );
}
