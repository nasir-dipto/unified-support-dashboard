import {
  mapConversationToRecord,
  mergeHdConversationWithNote,
} from './mapConversationToRecord.js';
import {
  deleteTicketComment,
  listTicketComments,
  upsertTicketComment,
} from '../db/tables/comments.js';
import { markSentimentStale } from '../db/tables/tickets.js';
import {
  fetchRequestConversations,
  fetchRequestNotes,
} from '../services/helpdesk.service.js';

type Json = Record<string, unknown>;

/**
 * Coerces unknown SDP JSON scalars to a safe string id.
 */
function hdIdToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * Indexes HD notes by id for merging description text into conversation rows.
 */
function indexNotesById(notes: Json[]): Map<string, Json> {
  const out = new Map<string, Json>();
  for (const note of notes) {
    const id = hdIdToString(note.id);
    if (id.length === 0) {
      continue;
    }
    out.set(id, note);
  }
  return out;
}

/**
 * Syncs HD request conversations into `support_ticket_comments` for a USD ticket.
 * Conversation list supplies type/metadata; notes list supplies `description` body text.
 */
export async function syncRequestConversations(params: {
  orgId: string;
  ticketId: string;
  internalId: string;
}): Promise<number> {
  const [{ conversations }, { notes }] = await Promise.all([
    fetchRequestConversations(params.internalId, { rowCount: 50 }),
    fetchRequestNotes(params.internalId, { rowCount: 50 }),
  ]);
  const notesById = indexNotesById(notes);
  const seenSourceIds = new Set<string>();
  let synced = 0;
  for (const row of conversations) {
    const sourceId = hdIdToString(row.id);
    if (sourceId.length === 0 || seenSourceIds.has(sourceId)) {
      continue;
    }
    seenSourceIds.add(sourceId);
    const merged = mergeHdConversationWithNote(row, notesById.get(sourceId));
    const record = mapConversationToRecord({
      orgId: params.orgId,
      ticketId: params.ticketId,
      conversation: merged,
    });
    if (record !== null) {
      await removeStaleSyncedCommentRows({
        orgId: params.orgId,
        ticketId: params.ticketId,
        canonicalCommentId: record.commentId,
        sourceCommentId: record.sourceCommentId ?? sourceId,
      });
      await upsertTicketComment(record);
      synced += 1;
    }
  }
  if (synced > 0) {
    await markSentimentStale(params.orgId, params.ticketId);
  }
  return synced;
}

/**
 * Deletes legacy comment rows that share the same HD source id under a different `commentId`.
 */
async function removeStaleSyncedCommentRows(params: {
  orgId: string;
  ticketId: string;
  canonicalCommentId: string;
  sourceCommentId: string;
}): Promise<void> {
  const { items } = await listTicketComments(params.orgId, params.ticketId, 500);
  const hdPrefix = `hd_${params.sourceCommentId}`;
  for (const item of items) {
    if (item.commentId === params.canonicalCommentId) {
      continue;
    }
    const matchesSource =
      item.sourceCommentId === params.sourceCommentId ||
      item.commentId === params.sourceCommentId ||
      item.commentId === hdPrefix;
    if (matchesSource) {
      await deleteTicketComment(params.orgId, `${params.ticketId}#${item.commentId}`);
    }
  }
}
