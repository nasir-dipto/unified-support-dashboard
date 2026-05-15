import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { SupportTicketRecord, TicketApiDto } from '@usd/shared-types';
import { supportTicketRecordSchema, ticketApiDtoSchema } from '@usd/shared-types';
import { getServerEnv } from '../../config/loadEnv.js';
import { AppError } from '../../utils/errors.js';
import { getDocumentClient } from '../dynamo.client.js';

const ORG_CREATED_GSI = 'orgId-createdAt';

export type ListTicketsParams = {
  orgId: string;
  limit: number;
  cursor?: string;
};

/**
 * Encodes DynamoDB `LastEvaluatedKey` for pagination cursors.
 */
function encodeLastKey(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key), 'utf8').toString('base64url');
}

/**
 * Decodes a list cursor into a DynamoDB `ExclusiveStartKey` (must match org).
 */
function decodeLastKey(cursor: string, orgId: string): Record<string, unknown> {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (parsed.orgId !== orgId) {
      throw new AppError('Invalid cursor', 'VALIDATION', 400);
    }
    return parsed;
  } catch (e) {
    if (e instanceof AppError) {
      throw e;
    }
    throw new AppError('Invalid cursor', 'VALIDATION', 400);
  }
}

/**
 * Inserts or updates a ticket; preserves `createdAt` when the item already exists.
 */
export async function upsertTicket(record: SupportTicketRecord): Promise<SupportTicketRecord> {
  const parsed = supportTicketRecordSchema.parse(record);
  const env = getServerEnv();
  const doc = getDocumentClient();
  const existing = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Key: { ticketId: parsed.ticketId },
    }),
  );
  const prev = existing.Item as SupportTicketRecord | undefined;
  const createdAt =
    prev?.createdAt !== undefined && prev.createdAt.length > 0 ? prev.createdAt : parsed.createdAt;
  const linkedTicketId =
    parsed.linkedTicketId !== undefined && parsed.linkedTicketId.length > 0
      ? parsed.linkedTicketId
      : prev?.linkedTicketId;
  const internalId =
    parsed.internalId !== undefined && parsed.internalId.length > 0
      ? parsed.internalId
      : prev?.internalId;
  const merged = supportTicketRecordSchema.parse({
    ...parsed,
    createdAt,
    updatedAt: parsed.updatedAt,
    linkedTicketId,
    internalId,
  });
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Item: merged,
    }),
  );
  return merged;
}

/**
 * Reads a ticket record when it exists (no org guard); used before upsert for diffing.
 */
export async function getTicketRecordOrUndefined(
  ticketId: string,
): Promise<SupportTicketRecord | undefined> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Key: { ticketId },
    }),
  );
  if (out.Item === undefined) {
    return undefined;
  }
  const rec = supportTicketRecordSchema.safeParse(out.Item);
  return rec.success ? rec.data : undefined;
}

/**
 * Loads a ticket by id and ensures it belongs to the given org.
 */
export async function getTicketById(orgId: string, ticketId: string): Promise<TicketApiDto> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Key: { ticketId },
    }),
  );
  const item = out.Item;
  if (item === undefined) {
    throw new AppError('Ticket not found', 'NOT_FOUND', 404);
  }
  const rec = supportTicketRecordSchema.parse(item);
  if (rec.orgId !== orgId) {
    throw new AppError('Ticket not found', 'NOT_FOUND', 404);
  }
  return ticketApiDtoSchema.parse(rec);
}

/**
 * Lists tickets for an org (newest first) using the orgId-createdAt GSI.
 */
export async function listTickets(params: ListTicketsParams): Promise<{
  items: TicketApiDto[];
  cursor?: string;
  total: number;
}> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const countOut = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      IndexName: ORG_CREATED_GSI,
      KeyConditionExpression: 'orgId = :o',
      ExpressionAttributeValues: { ':o': params.orgId },
      Select: 'COUNT',
    }),
  );
  const total = countOut.Count ?? 0;
  const exclusiveStartKey =
    params.cursor !== undefined ? decodeLastKey(params.cursor, params.orgId) : undefined;
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      IndexName: ORG_CREATED_GSI,
      KeyConditionExpression: 'orgId = :o',
      ExpressionAttributeValues: { ':o': params.orgId },
      Limit: params.limit,
      ScanIndexForward: false,
      ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
    }),
  );
  const items = (out.Items ?? [])
    .map((it) => supportTicketRecordSchema.safeParse(it))
    .filter((r) => r.success)
    .map((r) => ticketApiDtoSchema.parse(r.data));
  const lek = out.LastEvaluatedKey;
  const cursor = lek !== undefined ? encodeLastKey(lek as Record<string, unknown>) : undefined;
  return { items, cursor, total };
}

/**
 * Links two tickets (Jira ↔ Helpdesk) in the same org by setting `linkedTicketId` on both items.
 */
export async function linkTicketsBidirectional(params: {
  orgId: string;
  ticketId: string;
  linkedTicketId: string;
}): Promise<{ ticket: TicketApiDto; linkedTicket: TicketApiDto }> {
  if (params.ticketId === params.linkedTicketId) {
    throw new AppError('Cannot link a ticket to itself', 'VALIDATION', 400);
  }
  const ticketA = await getTicketById(params.orgId, params.ticketId);
  const ticketB = await getTicketById(params.orgId, params.linkedTicketId);
  if (ticketA.source === ticketB.source) {
    throw new AppError(
      'Cross-link requires one Jira ticket and one Helpdesk ticket',
      'VALIDATION',
      400,
    );
  }
  const env = getServerEnv();
  const doc = getDocumentClient();
  const now = new Date().toISOString();

  const recAOut = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Key: { ticketId: params.ticketId },
    }),
  );
  const recBOut = await doc.send(
    new GetCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Key: { ticketId: params.linkedTicketId },
    }),
  );
  const rawA = recAOut.Item;
  const rawB = recBOut.Item;
  if (rawA === undefined || rawB === undefined) {
    throw new AppError('Ticket not found', 'NOT_FOUND', 404);
  }
  const baseA = supportTicketRecordSchema.parse(rawA);
  const baseB = supportTicketRecordSchema.parse(rawB);
  if (baseA.orgId !== params.orgId || baseB.orgId !== params.orgId) {
    throw new AppError('Ticket not found', 'NOT_FOUND', 404);
  }

  const updatedA = supportTicketRecordSchema.parse({
    ...baseA,
    linkedTicketId: params.linkedTicketId,
    updatedAt: now,
  });
  const updatedB = supportTicketRecordSchema.parse({
    ...baseB,
    linkedTicketId: params.ticketId,
    updatedAt: now,
  });

  await doc.send(new PutCommand({ TableName: env.SUPPORT_TICKETS_TABLE, Item: updatedA }));
  await doc.send(new PutCommand({ TableName: env.SUPPORT_TICKETS_TABLE, Item: updatedB }));

  return {
    ticket: ticketApiDtoSchema.parse(updatedA),
    linkedTicket: ticketApiDtoSchema.parse(updatedB),
  };
}
