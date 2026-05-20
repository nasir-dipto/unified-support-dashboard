import { mapJiraCommentToRecord } from './mapJiraCommentToRecord.js';
import {
  deleteTicketComment,
  listTicketComments,
  upsertTicketComment,
} from '../db/tables/comments.js';
import { fetchIssueComments } from '../services/jira.service.js';

/**
 * Builds the canonical DynamoDB `commentId` for a synced Jira comment.
 */
export function buildJiraSyncedCommentId(sourceCommentId: string): string {
  return `jira_${sourceCommentId}`;
}

/**
 * Deletes legacy rows for the same Jira `sourceCommentId` stored under a different `commentId`.
 */
async function removeStaleJiraSyncedRows(params: {
  orgId: string;
  ticketId: string;
  canonicalCommentId: string;
  sourceCommentId: string;
}): Promise<void> {
  const { items } = await listTicketComments(params.orgId, params.ticketId, 500);
  const legacyIds = new Set([
    params.sourceCommentId,
    buildJiraSyncedCommentId(params.sourceCommentId),
  ]);
  for (const item of items) {
    if (item.commentId === params.canonicalCommentId) {
      continue;
    }
    const matchesSource =
      item.sourceCommentId === params.sourceCommentId || legacyIds.has(item.commentId);
    if (matchesSource && item.commentSource === 'jira_comment') {
      await deleteTicketComment(params.orgId, `${params.ticketId}#${item.commentId}`);
    }
  }
}

/**
 * Returns true when the row is a USD-local comment (not synced from Jira/HD).
 */
function isUsdAuthoredComment(commentId: string, commentSource: string | undefined): boolean {
  if (commentSource === 'usd_comment') {
    return true;
  }
  if (commentSource !== undefined) {
    return false;
  }
  return !commentId.startsWith('jira_') && !commentId.startsWith('hd_');
}

/**
 * Removes USD-authored rows that mirror a Jira comment already synced (same body text).
 */
async function removeUsdMirrorForJiraBody(params: {
  orgId: string;
  ticketId: string;
  body: string;
  keepCommentId: string;
}): Promise<void> {
  const normalized = params.body.trim();
  if (normalized.length === 0 || normalized === '—') {
    return;
  }
  const { items } = await listTicketComments(params.orgId, params.ticketId, 500);
  for (const item of items) {
    if (item.commentId === params.keepCommentId) {
      continue;
    }
    if (isUsdAuthoredComment(item.commentId, item.commentSource) && item.body.trim() === normalized) {
      await deleteTicketComment(params.orgId, `${params.ticketId}#${item.commentId}`);
    }
  }
}

/**
 * Syncs all Jira issue comments into `support_ticket_comments` for a USD ticket.
 */
export async function syncIssueComments(params: {
  orgId: string;
  ticketId: string;
  issueKey: string;
}): Promise<number> {
  let startAt = 0;
  const maxResults = 100;
  let synced = 0;
  let total = 0;
  const seenSourceIds = new Set<string>();
  do {
    const page = await fetchIssueComments(params.issueKey, { startAt, maxResults });
    total = page.total;
    for (const comment of page.comments) {
      const record = mapJiraCommentToRecord({
        orgId: params.orgId,
        ticketId: params.ticketId,
        comment,
      });
      if (record === null || record.sourceCommentId === undefined) {
        continue;
      }
      if (seenSourceIds.has(record.sourceCommentId)) {
        continue;
      }
      seenSourceIds.add(record.sourceCommentId);
      await removeStaleJiraSyncedRows({
        orgId: params.orgId,
        ticketId: params.ticketId,
        canonicalCommentId: record.commentId,
        sourceCommentId: record.sourceCommentId,
      });
      await upsertTicketComment(record);
      await removeUsdMirrorForJiraBody({
        orgId: params.orgId,
        ticketId: params.ticketId,
        body: record.body,
        keepCommentId: record.commentId,
      });
      synced += 1;
    }
    if (page.comments.length === 0) {
      break;
    }
    startAt += page.comments.length;
  } while (startAt < total);
  return synced;
}
