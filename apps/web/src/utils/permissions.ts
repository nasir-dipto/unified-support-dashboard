import type { SupportRole, TicketApiDto } from '@usd/shared-types';
import { canAccessAdminPanel, canAccessManagerPanel } from './roles.js';

/**
 * Normalizes a string for assignee matching.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns true when the ticket assignee matches the user email or display name.
 */
export function isTicketAssignedToUser(
  ticket: Pick<TicketApiDto, 'assigneeId'>,
  userEmail: string,
  userDisplayName?: string,
): boolean {
  const assignee = ticket.assigneeId?.trim();
  if (assignee === undefined || assignee.length === 0) {
    return false;
  }
  const a = normalize(assignee);
  const email = normalize(userEmail);
  if (a === email) {
    return true;
  }
  const displayName = userDisplayName?.trim();
  if (displayName !== undefined && displayName.length > 0 && a === normalize(displayName)) {
    return true;
  }
  const local = email.split('@')[0] ?? '';
  return local.length > 0 && (a === local || a.includes(local.replace(/[._-]/g, ' ')));
}

/**
 * Returns true when the user may write to the ticket (comments, link, AI actions).
 */
export function canWriteTicket(
  roles: SupportRole[],
  ticket: Pick<TicketApiDto, 'assigneeId'>,
  userEmail: string,
  userDisplayName?: string,
): boolean {
  if (canAccessManagerPanel(roles)) {
    return true;
  }
  if (roles.includes('technician')) {
    return isTicketAssignedToUser(ticket, userEmail, userDisplayName);
  }
  return false;
}

/**
 * Returns true when the user may write on a merged incident (assigned to either ticket).
 */
export function canWriteMergedIncident(
  roles: SupportRole[],
  primary: Pick<TicketApiDto, 'assigneeId'>,
  linked: Pick<TicketApiDto, 'assigneeId'>,
  userEmail: string,
  userDisplayName?: string,
): boolean {
  if (canAccessManagerPanel(roles)) {
    return true;
  }
  if (roles.includes('technician')) {
    return (
      isTicketAssignedToUser(primary, userEmail, userDisplayName) ||
      isTicketAssignedToUser(linked, userEmail, userDisplayName)
    );
  }
  return false;
}

/**
 * Re-exports for convenience in components.
 */
export { canAccessAdminPanel, canAccessManagerPanel };
