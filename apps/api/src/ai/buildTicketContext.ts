import { getTicketById } from '../db/tables/tickets.js';
import { listTicketComments } from '../db/tables/comments.js';
import type { AiTicketContext } from './types.js';

const COMMENT_PAGE = 200;

/**
 * Loads ticket, conversation thread, and optional linked ticket data for AI features.
 */
export async function buildAiTicketContext(
  orgId: string,
  ticketId: string,
): Promise<AiTicketContext> {
  const ticket = await getTicketById(orgId, ticketId);
  const { items: comments } = await listTicketComments(orgId, ticketId, COMMENT_PAGE);

  let linked: AiTicketContext['linked'];
  if (ticket.linkedTicketId !== undefined && ticket.linkedTicketId.length > 0) {
    const linkedTicket = await getTicketById(orgId, ticket.linkedTicketId);
    const { items: linkedComments } = await listTicketComments(
      orgId,
      ticket.linkedTicketId,
      COMMENT_PAGE,
    );
    linked = { ticket: linkedTicket, comments: linkedComments };
  }

  return { ticket, comments, linked };
}
