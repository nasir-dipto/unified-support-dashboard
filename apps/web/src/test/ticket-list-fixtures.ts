import type { TicketsListFacets, TicketsListPagination } from '@usd/shared-types';

/**
 * Empty facets fixture for list response tests.
 */
export function emptyTicketListFacets(overrides: Partial<TicketsListFacets> = {}): TicketsListFacets {
  return {
    projects: {},
    sources: { jira: 0, helpdesk: 0 },
    priorities: { critical: 0, high: 0, medium: 0, low: 0 },
    statuses: { open: 0, in_progress: 0, resolved: 0, closed: 0, pending: 0 },
    mineCount: 0,
    viewCounts: { all: 0, mine: 0, jira: 0, me: 0 },
    bucketCounts: { all: 0, open: 0, closed: 0 },
    ...overrides,
  };
}

/**
 * Default pagination fixture for list response tests.
 */
export function defaultTicketListPagination(
  overrides: Partial<TicketsListPagination> = {},
): TicketsListPagination {
  return {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
    ...overrides,
  };
}
