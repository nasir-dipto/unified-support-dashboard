import type { SupportTicketRecord } from '@usd/shared-types';
import { ticketApiDtoSchema } from '@usd/shared-types';
import { broadcastWsEnvelope } from '../services/websocket.service.js';

function isTerminalStatus(status: string): boolean {
  return status === 'resolved' || status === 'closed';
}

/**
 * Derives and sends a ticket lifecycle WebSocket message after Dynamo upsert (webhooks, SQS).
 */
export function broadcastTicketLifecycleEvent(
  previous: SupportTicketRecord | undefined,
  merged: SupportTicketRecord,
): void {
  const ticket = ticketApiDtoSchema.parse(merged);
  const payload: Record<string, unknown> = { ticket };

  if (previous === undefined) {
    broadcastWsEnvelope({
      type: 'ticket_created',
      ticketId: merged.ticketId,
      orgId: merged.orgId,
      payload,
    });
    return;
  }

  const wasTerminal = isTerminalStatus(previous.status);
  const nowTerminal = isTerminalStatus(merged.status);
  if (!wasTerminal && nowTerminal) {
    broadcastWsEnvelope({
      type: 'ticket_resolved',
      ticketId: merged.ticketId,
      orgId: merged.orgId,
      payload,
    });
    return;
  }

  broadcastWsEnvelope({
    type: 'ticket_updated',
    ticketId: merged.ticketId,
    orgId: merged.orgId,
    payload,
  });
}
