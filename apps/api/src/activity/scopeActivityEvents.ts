import type { SupportRole, WsOutboundEnvelope } from '@usd/shared-types';
import { canAccessManagerFeatures, isTechnician } from '../utils/role-helpers.js';

/** Max events loaded from DynamoDB before role-based filtering. */
export const ACTIVITY_RAW_FETCH_LIMIT = 200;

/**
 * Applies technician mine-scoping to recent activity; managers see all events.
 */
export function scopeActivityEventsForRole(
  events: WsOutboundEnvelope[],
  roles: SupportRole[],
  assignedTicketIds: ReadonlySet<string>,
  limit: number,
): WsOutboundEnvelope[] {
  let scoped = events;
  if (!canAccessManagerFeatures(roles) && isTechnician(roles)) {
    scoped = events.filter((event) => assignedTicketIds.has(event.ticketId));
  }
  return scoped.slice(0, limit);
}
