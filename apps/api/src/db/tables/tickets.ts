import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  SentimentAnalysisResult,
  SupportTicketRecord,
  TicketApiDto,
  TicketsListFacets,
  TicketsListQuery,
} from '@usd/shared-types';
import { supportTicketRecordSchema } from '@usd/shared-types';
import { getServerEnv } from '../../config/loadEnv.js';
import { AppError } from '../../utils/errors.js';
import { toTicketApiDto } from '../../utils/sla.js';
import {
  computeTicketFacets,
  filterTickets,
  paginateTicketSlice,
  sortTickets,
  type TicketListUserContext,
} from '../../tickets/filterAndSortTickets.js';
import { getOrgSlaPolicy } from './org-settings.js';
import { getDocumentClient } from '../dynamo.client.js';

const ORG_CREATED_GSI = 'orgId-createdAt';

export type ListTicketsParams = TicketsListQuery & {
  orgId: string;
  user?: TicketListUserContext;
};

export type ListTicketsResult = {
  items: TicketApiDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets: TicketsListFacets;
};

/**
 * Returns true when an incoming upsert should not overwrite core ticket fields.
 */
export function isStaleTicketUpsert(
  prev: SupportTicketRecord | undefined,
  incomingUpdatedAt: string,
): boolean {
  if (prev?.updatedAt === undefined || prev.updatedAt.length === 0) {
    return false;
  }
  return incomingUpdatedAt <= prev.updatedAt;
}

/**
 * Merges preservation and sentiment fields for ticket upsert.
 */
export function mergeTicketUpsertFields(
  prev: SupportTicketRecord | undefined,
  parsed: SupportTicketRecord,
  isStale: boolean,
): SupportTicketRecord {
  const createdAt = parsed.createdAt;
  const linkedTicketId =
    parsed.linkedTicketId !== undefined && parsed.linkedTicketId.length > 0
      ? parsed.linkedTicketId
      : prev?.linkedTicketId;
  const internalId =
    parsed.internalId !== undefined && parsed.internalId.length > 0
      ? parsed.internalId
      : prev?.internalId;
  const sentiment =
    parsed.sentiment !== undefined && parsed.sentiment !== null
      ? parsed.sentiment
      : prev?.sentiment;
  const sentimentScore =
    parsed.sentimentScore !== undefined && parsed.sentimentScore !== null
      ? parsed.sentimentScore
      : prev?.sentimentScore;
  const churnRisk =
    parsed.churnRisk !== undefined ? parsed.churnRisk : prev?.churnRisk;
  const sentimentStale =
    parsed.sentimentStale !== undefined ? parsed.sentimentStale : prev?.sentimentStale;
  const sentimentAt =
    parsed.sentimentAt !== undefined && parsed.sentimentAt !== null
      ? parsed.sentimentAt
      : prev?.sentimentAt;

  if (isStale && prev !== undefined) {
    return supportTicketRecordSchema.parse({
      ...prev,
      createdAt,
      updatedAt: prev.updatedAt,
      linkedTicketId,
      internalId,
      sentiment,
      sentimentScore,
      churnRisk,
      sentimentStale,
      sentimentAt,
    });
  }

  return supportTicketRecordSchema.parse({
    ...parsed,
    createdAt,
    updatedAt: parsed.updatedAt,
    linkedTicketId,
    internalId,
    sentiment,
    sentimentScore,
    churnRisk,
    sentimentStale,
    sentimentAt,
  });
}

/**
 * Returns true when a stale upsert still needs a DynamoDB write (sentiment or preservation fields).
 */
export function staleUpsertNeedsWrite(
  prev: SupportTicketRecord | undefined,
  merged: SupportTicketRecord,
): boolean {
  if (prev === undefined) {
    return true;
  }
  if (merged.linkedTicketId !== prev.linkedTicketId) {
    return true;
  }
  if (merged.internalId !== prev.internalId) {
    return true;
  }
  if (merged.sentiment !== prev.sentiment) {
    return true;
  }
  if (merged.sentimentScore !== prev.sentimentScore) {
    return true;
  }
  if (merged.churnRisk !== prev.churnRisk) {
    return true;
  }
  if (merged.sentimentStale !== prev.sentimentStale) {
    return true;
  }
  if (merged.sentimentAt !== prev.sentimentAt) {
    return true;
  }
  return false;
}

/**
 * Inserts or updates a ticket; preserves sentiment fields when the item already exists.
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
  const stale = isStaleTicketUpsert(prev, parsed.updatedAt);
  if (stale) {
    console.debug(
      `Skipping stale upsert for ticket ${parsed.ticketId}: incoming ${parsed.updatedAt} <= stored ${prev?.updatedAt ?? ''}`,
    );
  }
  const merged = mergeTicketUpsertFields(prev, parsed, stale);
  const shouldWrite = !stale || staleUpsertNeedsWrite(prev, merged);
  if (shouldWrite) {
    await doc.send(
      new PutCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        Item: merged,
      }),
    );
  }
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
  const policy = await getOrgSlaPolicy(orgId);
  return toTicketApiDto(rec, policy);
}

/**
 * Lists all tickets for an org by paginating the orgId-createdAt GSI.
 */
export async function listAllTicketsForOrg(orgId: string): Promise<SupportTicketRecord[]> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const items: SupportTicketRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await doc.send(
      new QueryCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        IndexName: ORG_CREATED_GSI,
        KeyConditionExpression: 'orgId = :o',
        ExpressionAttributeValues: { ':o': orgId },
        ScanIndexForward: false,
        ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of out.Items ?? []) {
      const parsed = supportTicketRecordSchema.safeParse(raw);
      if (parsed.success) {
        items.push(parsed.data);
      }
    }
    exclusiveStartKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey !== undefined);
  return items;
}

/**
 * Lists tickets for an org with filters, facets, sort, and page-based pagination.
 */
export async function listTickets(params: ListTicketsParams): Promise<ListTicketsResult> {
  const records = await listAllTicketsForOrg(params.orgId);
  const policy = await getOrgSlaPolicy(params.orgId);
  const allDtos = records.map((rec) => toTicketApiDto(rec, policy));
  const filters = {
    source: params.source,
    priority: params.priority,
    status: params.status,
    project: params.project,
    q: params.q,
    mine: params.mine,
  };
  const facets = computeTicketFacets(allDtos, filters, params.user);
  const filtered = filterTickets(allDtos, filters, params.user);
  const sorted = sortTickets(filtered, params.sort);
  const page = params.page;
  const limit = params.limit;
  const slice = paginateTicketSlice(sorted, page, limit);
  return {
    items: slice.pageItems,
    pagination: {
      page: slice.totalPages === 0 ? 1 : Math.min(page, slice.totalPages),
      limit,
      total: slice.total,
      totalPages: slice.totalPages,
      hasNext: slice.hasNext,
      hasPrev: slice.hasPrev,
    },
    facets,
  };
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

  const policy = await getOrgSlaPolicy(params.orgId);
  return {
    ticket: toTicketApiDto(updatedA, policy),
    linkedTicket: toTicketApiDto(updatedB, policy),
  };
}

/**
 * Marks a Helpdesk ticket as needing sentiment re-analysis (no-op for Jira).
 */
export async function markSentimentStale(orgId: string, ticketId: string): Promise<void> {
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
    return;
  }
  const rec = supportTicketRecordSchema.parse(item);
  if (rec.orgId !== orgId || rec.source !== 'helpdesk') {
    return;
  }
  const updated = supportTicketRecordSchema.parse({
    ...rec,
    sentimentStale: true,
    updatedAt: new Date().toISOString(),
  });
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Item: updated,
    }),
  );
}

export type ListHdTicketsForSentimentParams = {
  orgId: string;
  staleOnly: boolean;
};

/**
 * Lists Helpdesk tickets for an org via orgId GSI (paginates until exhausted).
 */
export async function listHdTicketsForSentiment(
  params: ListHdTicketsForSentimentParams,
): Promise<SupportTicketRecord[]> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const items: SupportTicketRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await doc.send(
      new QueryCommand({
        TableName: env.SUPPORT_TICKETS_TABLE,
        IndexName: ORG_CREATED_GSI,
        KeyConditionExpression: 'orgId = :o',
        FilterExpression:
          '#src = :hd' + (params.staleOnly ? ' AND sentimentStale = :stale' : ''),
        ExpressionAttributeNames: { '#src': 'source' },
        ExpressionAttributeValues: {
          ':o': params.orgId,
          ':hd': 'helpdesk',
          ...(params.staleOnly ? { ':stale': true } : {}),
        },
        ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of out.Items ?? []) {
      const parsed = supportTicketRecordSchema.safeParse(raw);
      if (parsed.success) {
        items.push(parsed.data);
      }
    }
    exclusiveStartKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey !== undefined);
  return items;
}

/**
 * Persists sentiment analysis results and clears the stale flag.
 */
export async function updateTicketSentiment(
  orgId: string,
  ticketId: string,
  result: SentimentAnalysisResult,
): Promise<SupportTicketRecord> {
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
  if (rec.orgId !== orgId || rec.source !== 'helpdesk') {
    throw new AppError('Sentiment applies to Helpdesk tickets only', 'VALIDATION', 400);
  }
  const now = new Date().toISOString();
  const updated = supportTicketRecordSchema.parse({
    ...rec,
    sentiment: result.sentiment,
    sentimentScore: result.sentimentScore,
    churnRisk: result.churnRisk,
    sentimentStale: false,
    sentimentAt: now,
    updatedAt: now,
  });
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Item: updated,
    }),
  );
  return updated;
}

/**
 * Lists Helpdesk tickets with sentiment for summary aggregation.
 */
export async function listHdTicketsWithSentiment(orgId: string): Promise<SupportTicketRecord[]> {
  const all = await listHdTicketsForSentiment({ orgId, staleOnly: false });
  return all;
}
