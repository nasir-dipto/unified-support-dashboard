import { mapConversationToRecord } from './mapConversationToRecord.js';
import { upsertTicketComment } from '../db/tables/comments.js';
import { fetchRequestConversations } from '../services/helpdesk.service.js';

/**
 * Syncs HD request conversations into `support_ticket_comments` for a USD ticket.
 */
export async function syncRequestConversations(params: {
  orgId: string;
  ticketId: string;
  internalId: string;
}): Promise<number> {
  const { conversations } = await fetchRequestConversations(params.internalId, { rowCount: 50 });
  let synced = 0;
  for (const row of conversations) {
    const record = mapConversationToRecord({
      orgId: params.orgId,
      ticketId: params.ticketId,
      conversation: row,
    });
    if (record !== null) {
      await upsertTicketComment(record);
      synced += 1;
    }
  }
  return synced;
}
