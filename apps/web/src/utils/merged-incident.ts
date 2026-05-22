import type { AuthUserPublic, TicketApiDto, TicketCommentApiDto } from '@usd/shared-types';
import { sortThreadComments } from './comment-display.js';
import {
  canAccessManagerPanel,
  canWriteTicket,
  isTicketAssignedToUser,
} from './permissions.js';

export type JiraHdPair = {
  jira: TicketApiDto;
  hd: TicketApiDto;
};

/**
 * Resolves Jira and HD tickets from a primary ticket and its linked counterpart.
 */
export function resolveJiraAndHdTickets(
  primary: TicketApiDto,
  linked: TicketApiDto | undefined,
): JiraHdPair | undefined {
  if (linked === undefined) {
    return undefined;
  }
  if (primary.source === 'jira' && linked.source === 'helpdesk') {
    return { jira: primary, hd: linked };
  }
  if (primary.source === 'helpdesk' && linked.source === 'jira') {
    return { jira: linked, hd: primary };
  }
  return undefined;
}

/**
 * Returns true when the ticket has a cross-system link suitable for merged view.
 */
export function isMergedIncident(
  ticket: TicketApiDto | undefined,
  linked: TicketApiDto | undefined,
): boolean {
  if (ticket === undefined) {
    return false;
  }
  return resolveJiraAndHdTickets(ticket, linked) !== undefined;
}

/**
 * Merges conversation comments from both tickets sorted by createdAt ascending.
 */
export function mergeThreadComments(
  primaryComments: TicketCommentApiDto[],
  linkedComments: TicketCommentApiDto[],
): TicketCommentApiDto[] {
  return sortThreadComments([...primaryComments, ...linkedComments]);
}

/**
 * Returns true when the user may perform any write action on a merged incident.
 */
export function canWriteMergedIncident(
  user: AuthUserPublic | null | undefined,
  jira: TicketApiDto,
  hd: TicketApiDto,
): boolean {
  if (user === null || user === undefined) {
    return false;
  }
  if (canAccessManagerPanel(user.roles)) {
    return true;
  }
  return (
    isTicketAssignedToUser(jira, user.email, user.displayName) ||
    isTicketAssignedToUser(hd, user.email, user.displayName)
  );
}

/**
 * Returns true when the user may post a Jira comment on the merged incident.
 */
export function canWriteJiraSide(
  user: AuthUserPublic | null | undefined,
  jira: TicketApiDto,
): boolean {
  if (user === null || user === undefined) {
    return false;
  }
  return canWriteTicket(user.roles, jira, user.email, user.displayName);
}

/**
 * Returns true when the user may post HD note/email on the merged incident.
 */
export function canWriteHdSide(
  user: AuthUserPublic | null | undefined,
  hd: TicketApiDto,
): boolean {
  if (user === null || user === undefined) {
    return false;
  }
  return canWriteTicket(user.roles, hd, user.email, user.displayName);
}
