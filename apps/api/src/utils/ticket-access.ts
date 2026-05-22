import type { SupportRole, TicketApiDto } from '@usd/shared-types';
import { canAccessManagerFeatures } from './role-helpers.js';

/**
 * Normalizes a label for case-insensitive assignee matching.
 */
function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns true when the ticket assignee matches the signed-in user (email or display name).
 */
export function isTicketAssignedToUser(
  ticket: Pick<TicketApiDto, 'assigneeId'>,
  userEmail: string,
): boolean {
  const assignee = ticket.assigneeId?.trim();
  if (assignee === undefined || assignee.length === 0) {
    return false;
  }
  const normalizedAssignee = normalizeLabel(assignee);
  const normalizedEmail = normalizeLabel(userEmail);
  if (normalizedAssignee === normalizedEmail) {
    return true;
  }
  const localPart = normalizedEmail.split('@')[0] ?? '';
  if (localPart.length > 0 && normalizedAssignee === localPart) {
    return true;
  }
  const displayFromEmail = localPart.replace(/[._-]/g, ' ');
  if (displayFromEmail.length > 0 && normalizedAssignee.includes(displayFromEmail)) {
    return true;
  }
  return normalizedAssignee.includes(normalizedEmail.split('@')[0] ?? '');
}

/**
 * Returns true when the principal may read the ticket (all authenticated roles).
 */
export function canReadTicket(): boolean {
  return true;
}

/**
 * Returns true when the principal may mutate the ticket (comment, link, etc.).
 */
export function canWriteTicket(
  roles: SupportRole[],
  ticket: Pick<TicketApiDto, 'assigneeId'>,
  userEmail: string,
): boolean {
  if (canAccessManagerFeatures(roles)) {
    return true;
  }
  if (roles.includes('technician')) {
    return isTicketAssignedToUser(ticket, userEmail);
  }
  return false;
}
