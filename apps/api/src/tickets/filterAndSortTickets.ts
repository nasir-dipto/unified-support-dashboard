import type {
  TicketApiDto,
  TicketListBucket,
  TicketListSort,
  TicketPriority,
  TicketStatus,
  TicketsListFacets,
  TicketsListQuery,
} from '@usd/shared-types';
import { isTicketAssignedToUser } from '../utils/ticket-access.js';

/** Facet bucket key for Helpdesk tickets (no Jira project key). */
export const HELPDESK_PROJECT_KEY = 'ManageEngine';

const PRIORITY_RANK: Record<TicketPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_RANK: Record<TicketStatus, number> = {
  open: 0,
  in_progress: 1,
  pending: 2,
  resolved: 3,
  closed: 4,
};

export type TicketListFilterParams = Pick<
  TicketsListQuery,
  'source' | 'priority' | 'status' | 'project' | 'q' | 'mine' | 'bucket'
>;

export type TicketListUserContext = {
  email: string;
  displayName?: string;
};

/**
 * Extracts Jira project key from external id (e.g. `TILMS-5` → `TILMS`) or Helpdesk bucket.
 */
export function getTicketProjectKey(ticket: Pick<TicketApiDto, 'source' | 'externalId'>): string {
  if (ticket.source === 'helpdesk') {
    return HELPDESK_PROJECT_KEY;
  }
  const dash = ticket.externalId.indexOf('-');
  if (dash > 0) {
    return ticket.externalId.slice(0, dash);
  }
  return ticket.externalId;
}

/**
 * Returns true when ticket matches free-text search (summary or ticketId, case-insensitive).
 */
export function ticketMatchesSearch(ticket: TicketApiDto, q: string | undefined): boolean {
  const needle = q?.trim().toLowerCase();
  if (needle === undefined || needle.length === 0) {
    return true;
  }
  return (
    ticket.summary.toLowerCase().includes(needle) ||
    ticket.ticketId.toLowerCase().includes(needle) ||
    ticket.externalId.toLowerCase().includes(needle)
  );
}

/**
 * Returns true when a ticket matches the display-only open/closed bucket filter.
 */
export function ticketMatchesBucket(
  ticket: Pick<TicketApiDto, 'status'>,
  bucket: TicketListBucket | undefined,
): boolean {
  if (bucket === undefined || bucket === 'all') {
    return true;
  }
  if (bucket === 'closed') {
    return ticket.status === 'closed';
  }
  return ticket.status !== 'closed';
}

/**
 * Applies list filters (excluding pagination/sort).
 */
export function filterTickets(
  tickets: TicketApiDto[],
  filters: TicketListFilterParams,
  user?: TicketListUserContext,
): TicketApiDto[] {
  return tickets.filter((t) => {
    if (filters.source !== undefined && t.source !== filters.source) {
      return false;
    }
    if (filters.priority !== undefined && t.priority !== filters.priority) {
      return false;
    }
    if (filters.status !== undefined && t.status !== filters.status) {
      return false;
    }
    if (!ticketMatchesBucket(t, filters.bucket)) {
      return false;
    }
    if (filters.project !== undefined && getTicketProjectKey(t) !== filters.project) {
      return false;
    }
    if (!ticketMatchesSearch(t, filters.q)) {
      return false;
    }
    if (filters.mine === true && user !== undefined) {
      if (!isTicketAssignedToUser(t, user.email, user.displayName)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Sorts tickets in place per list sort option.
 */
export function sortTickets(tickets: TicketApiDto[], sort: TicketListSort): TicketApiDto[] {
  const copy = [...tickets];
  copy.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return a.createdAt.localeCompare(b.createdAt);
      case 'priority': {
        const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        return diff !== 0 ? diff : b.createdAt.localeCompare(a.createdAt);
      }
      case 'status': {
        const diff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        return diff !== 0 ? diff : b.createdAt.localeCompare(a.createdAt);
      }
      case 'newest':
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  return copy;
}

/**
 * Slices a sorted array for page-based pagination.
 */
export function paginateTicketSlice<T>(
  items: T[],
  page: number,
  limit: number,
): { pageItems: T[]; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  const pageItems = items.slice(start, start + limit);
  return {
    pageItems,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

function emptyFacets(): TicketsListFacets {
  return {
    projects: {},
    sources: { jira: 0, helpdesk: 0 },
    priorities: { critical: 0, high: 0, medium: 0, low: 0 },
    statuses: { open: 0, in_progress: 0, resolved: 0, closed: 0, pending: 0 },
    mineCount: 0,
    viewCounts: { all: 0, mine: 0, jira: 0, me: 0 },
    bucketCounts: { all: 0, open: 0, closed: 0 },
  };
}

/**
 * Computes open/closed/all counts before the bucket filter is applied.
 */
export function computeBucketCounts(tickets: TicketApiDto[]): TicketsListFacets['bucketCounts'] {
  return {
    all: tickets.length,
    open: tickets.filter((t) => t.status !== 'closed').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
  };
}

/**
 * Builds facet counts for the filtered ticket set (before pagination; `mine` excluded from facet base).
 */
export function computeTicketFacets(
  tickets: TicketApiDto[],
  filters: TicketListFilterParams,
  user?: TicketListUserContext,
): TicketsListFacets {
  const facetFilters: TicketListFilterParams = {
    source: filters.source,
    priority: filters.priority,
    status: filters.status,
    project: filters.project,
    q: filters.q,
  };
  const base = filterTickets(tickets, facetFilters, user);
  if (base.length === 0) {
    return emptyFacets();
  }
  const projects: Record<string, number> = {};
  const facets = emptyFacets();
  facets.bucketCounts = computeBucketCounts(base);
  for (const t of base) {
    const pk = getTicketProjectKey(t);
    projects[pk] = (projects[pk] ?? 0) + 1;
    if (t.source === 'jira') {
      facets.sources.jira += 1;
    } else {
      facets.sources.helpdesk += 1;
    }
    facets.priorities[t.priority] += 1;
    facets.statuses[t.status] += 1;
    if (user !== undefined && isTicketAssignedToUser(t, user.email, user.displayName)) {
      facets.mineCount += 1;
    }
  }
  facets.projects = projects;

  const viewFilters: TicketListFilterParams = {
    priority: filters.priority,
    status: filters.status,
    project: filters.project,
    q: filters.q,
  };
  const viewBase = filterTickets(tickets, viewFilters, user);
  facets.viewCounts = {
    all: viewBase.length,
    mine:
      user === undefined
        ? 0
        : viewBase.filter((t) => isTicketAssignedToUser(t, user.email, user.displayName)).length,
    jira: viewBase.filter((t) => t.source === 'jira').length,
    me: viewBase.filter((t) => t.source === 'helpdesk').length,
  };

  return facets;
}
