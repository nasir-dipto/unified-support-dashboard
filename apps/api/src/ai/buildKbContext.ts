import { buildAiTicketContext } from './buildTicketContext.js';
import type { AiTicketContext } from './types.js';

/**
 * Loads ticket + linked ticket context for KB draft and semantic search.
 */
export async function buildKbContext(orgId: string, ticketId: string): Promise<AiTicketContext> {
  return buildAiTicketContext(orgId, ticketId);
}
