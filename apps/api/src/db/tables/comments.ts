import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type {
  CommentSource,
  SupportTicketCommentRecord,
  TicketCommentApiDto,
} from '@usd/shared-types';
import {
  supportTicketCommentRecordSchema,
  ticketCommentApiDtoSchema,
} from '@usd/shared-types';
import { ulid } from 'ulid';
import { getServerEnv } from '../../config/loadEnv.js';
import { getDocumentClient } from '../dynamo.client.js';

const DEFAULT_PAGE = 200;

/**
 * Builds the DynamoDB sort key for a ticket comment (`${ticketId}#${commentId}`).
 */
export function buildTicketCommentSortKey(ticketId: string, commentId: string): string {
  return `${ticketId}#${commentId}`;
}

/**
 * Infers `commentSource` for legacy rows written before Phase 5A enrichment.
 */
export function inferCommentSourceFromCommentId(commentId: string): CommentSource {
  if (commentId.startsWith('jira_')) {
    return 'jira_comment';
  }
  if (commentId.startsWith('hd_')) {
    return 'hd_note';
  }
  return 'usd_comment';
}

/**
 * Fills missing `commentSource` on raw DynamoDB items so Zod parse succeeds.
 */
export function normalizeCommentRecordRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const commentId = typeof row.commentId === 'string' ? row.commentId : '';
  if (row.commentSource === undefined || row.commentSource === null) {
    return { ...row, commentSource: inferCommentSourceFromCommentId(commentId) };
  }
  return row;
}

/**
 * Sorts comments oldest-first by `createdAt` for conversation thread display.
 */
export function sortCommentsAscending(items: TicketCommentApiDto[]): TicketCommentApiDto[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Idempotent write for synced comments (Jira/HD) keyed by stable `commentId`.
 */
export async function upsertTicketComment(record: SupportTicketCommentRecord): Promise<TicketCommentApiDto> {
  const env = getServerEnv();
  const parsed = supportTicketCommentRecordSchema.parse(record);
  const doc = getDocumentClient();
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKET_COMMENTS_TABLE,
      Item: parsed,
    }),
  );
  return ticketCommentApiDtoSchema.parse(parsed);
}

/**
 * Persists a USD-authored comment against a ticket (org-scoped partition key).
 */
export async function createTicketComment(params: {
  orgId: string;
  ticketId: string;
  body: string;
  authorUserId?: string;
  authorEmail?: string;
}): Promise<TicketCommentApiDto> {
  const env = getServerEnv();
  const commentId = ulid();
  const ticketCommentKey = buildTicketCommentSortKey(params.ticketId, commentId);
  const createdAt = new Date().toISOString();
  const item: SupportTicketCommentRecord = supportTicketCommentRecordSchema.parse({
    orgId: params.orgId,
    ticketCommentKey,
    ticketId: params.ticketId,
    commentId,
    body: params.body,
    commentSource: 'usd_comment',
    authorUserId: params.authorUserId,
    authorEmail: params.authorEmail,
    createdAt,
  });
  const doc = getDocumentClient();
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKET_COMMENTS_TABLE,
      Item: item,
    }),
  );
  return ticketCommentApiDtoSchema.parse(item);
}

/**
 * Deletes a comment row (rollback helper when upstream ticket system rejects the note).
 */
export async function deleteTicketComment(orgId: string, ticketCommentKey: string): Promise<void> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  await doc.send(
    new DeleteCommand({
      TableName: env.SUPPORT_TICKET_COMMENTS_TABLE,
      Key: { orgId, ticketCommentKey },
    }),
  );
}

/**
 * Lists comments for a ticket (oldest first) using orgId + ticketId key condition.
 */
export async function listTicketComments(
  orgId: string,
  ticketId: string,
  limit: number = DEFAULT_PAGE,
): Promise<{ items: TicketCommentApiDto[]; total: number }> {
  const env = getServerEnv();
  const doc = getDocumentClient();
  const prefix = `${ticketId}#`;
  const countOut = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_TICKET_COMMENTS_TABLE,
      KeyConditionExpression: 'orgId = :o AND begins_with(ticketCommentKey, :p)',
      ExpressionAttributeValues: {
        ':o': orgId,
        ':p': prefix,
      },
      Select: 'COUNT',
    }),
  );
  const total = countOut.Count ?? 0;
  const out = await doc.send(
    new QueryCommand({
      TableName: env.SUPPORT_TICKET_COMMENTS_TABLE,
      KeyConditionExpression: 'orgId = :o AND begins_with(ticketCommentKey, :p)',
      ExpressionAttributeValues: {
        ':o': orgId,
        ':p': prefix,
      },
      Limit: limit,
      ScanIndexForward: true,
    }),
  );
  const items = (out.Items ?? [])
    .map((row) =>
      supportTicketCommentRecordSchema.safeParse(
        normalizeCommentRecordRow(row as Record<string, unknown>),
      ),
    )
    .filter((r): r is { success: true; data: SupportTicketCommentRecord } => r.success)
    .map((r) => ticketCommentApiDtoSchema.parse(r.data));
  return { items: sortCommentsAscending(items), total };
}
