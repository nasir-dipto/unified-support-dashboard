import { z } from 'zod';
import { ticketApiDtoSchema } from '../tickets/schemas.js';

/** Server → client WebSocket event kinds (Phase 4). */
export const wsMessageTypeSchema = z.enum([
  'ticket_created',
  'ticket_updated',
  'comment_added',
  'ticket_resolved',
]);

export type WsMessageType = z.infer<typeof wsMessageTypeSchema>;

/**
 * Canonical outbound envelope broadcast to authenticated org subscribers.
 * `payload` carries event-specific JSON (validated partially per handler).
 */
export const wsOutboundEnvelopeSchema = z.object({
  type: wsMessageTypeSchema,
  ticketId: z.string().min(1),
  orgId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type WsOutboundEnvelope = z.infer<typeof wsOutboundEnvelopeSchema>;

/** Typical shapes nested inside `payload` for ticket lifecycle events. */
export const wsTicketPayloadSchema = z.object({
  ticket: ticketApiDtoSchema,
});

export type WsTicketPayload = z.infer<typeof wsTicketPayloadSchema>;

/** Payload for `comment_added` broadcasts. */
export const wsCommentAddedPayloadSchema = z.object({
  ticketId: z.string().min(1),
  commentId: z.string().min(1),
  body: z.string(),
  authorUserId: z.string().optional(),
  authorEmail: z.string().optional(),
  createdAt: z.string().min(1),
});

export type WsCommentAddedPayload = z.infer<typeof wsCommentAddedPayloadSchema>;
