import { describe, expect, it } from 'vitest';
import type { TicketApiDto } from '@usd/shared-types';
import {
  computeBucketCounts,
  computeTicketFacets,
  filterTickets,
  getTicketProjectKey,
  HELPDESK_PROJECT_KEY,
  paginateTicketSlice,
  sortTickets,
  ticketMatchesBucket,
  ticketMatchesSearch,
} from './filterAndSortTickets.js';

function ticket(overrides: Partial<TicketApiDto> = {}): TicketApiDto {
  return {
    ticketId: 'jira_TILMS-1',
    orgId: 'ti',
    source: 'jira',
    externalId: 'TILMS-1',
    summary: 'Alpha issue',
    priority: 'high',
    status: 'open',
    assigneeId: 'tech@usd.dev',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('getTicketProjectKey', () => {
  it('extracts Jira project from external id', () => {
    expect(getTicketProjectKey(ticket({ externalId: 'TPDI-99' }))).toBe('TPDI');
  });

  it('returns ManageEngine for helpdesk', () => {
    expect(
      getTicketProjectKey(
        ticket({ source: 'helpdesk', externalId: '501', ticketId: 'hd_501' }),
      ),
    ).toBe(HELPDESK_PROJECT_KEY);
  });
});

describe('filterTickets', () => {
  const rows = [
    ticket(),
    ticket({
      ticketId: 'hd_2',
      source: 'helpdesk',
      externalId: '2',
      summary: 'Beta',
      priority: 'critical',
      assigneeId: undefined,
    }),
  ];

  it('filters by source and priority', () => {
    const out = filterTickets(rows, { source: 'jira', priority: 'high' });
    expect(out).toHaveLength(1);
    expect(out[0]?.ticketId).toBe('jira_TILMS-1');
  });

  it('filters by search q', () => {
    expect(filterTickets(rows, { q: 'beta' })).toHaveLength(1);
    expect(ticketMatchesSearch(rows[0] as TicketApiDto, 'alpha')).toBe(true);
  });

  it('filters mine by assignee', () => {
    const out = filterTickets(rows, { mine: true }, { email: 'tech@usd.dev' });
    expect(out).toHaveLength(1);
  });

  it('filters open bucket (status !== closed)', () => {
    const mixed = [
      ticket({ status: 'open' }),
      ticket({ ticketId: 'jira_X-2', externalId: 'X-2', status: 'in_progress' }),
      ticket({ ticketId: 'jira_X-3', externalId: 'X-3', status: 'closed' }),
      ticket({ ticketId: 'jira_X-4', externalId: 'X-4', status: 'resolved' }),
    ];
    const out = filterTickets(mixed, { bucket: 'open' });
    expect(out).toHaveLength(3);
    expect(out.every((t) => t.status !== 'closed')).toBe(true);
  });

  it('filters closed bucket only', () => {
    const mixed = [
      ticket({ status: 'open' }),
      ticket({ ticketId: 'jira_X-3', externalId: 'X-3', status: 'closed' }),
    ];
    expect(filterTickets(mixed, { bucket: 'closed' })).toHaveLength(1);
    expect(filterTickets(mixed, { bucket: 'all' })).toHaveLength(2);
    expect(filterTickets(mixed, {})).toHaveLength(2);
  });

  it('ticketMatchesBucket treats non-closed as open', () => {
    expect(ticketMatchesBucket(ticket({ status: 'pending' }), 'open')).toBe(true);
    expect(ticketMatchesBucket(ticket({ status: 'closed' }), 'open')).toBe(false);
  });
});

describe('sortTickets', () => {
  it('sorts by priority high before low', () => {
    const rows = sortTickets(
      [
        ticket({ priority: 'low', createdAt: '2026-01-03T00:00:00.000Z' }),
        ticket({ priority: 'critical', createdAt: '2026-01-01T00:00:00.000Z' }),
      ],
      'priority',
    );
    expect(rows[0]?.priority).toBe('critical');
  });
});

describe('paginateTicketSlice', () => {
  it('returns page slice and flags', () => {
    const { pageItems, totalPages, hasNext, hasPrev } = paginateTicketSlice(
      [1, 2, 3, 4, 5],
      2,
      2,
    );
    expect(pageItems).toEqual([3, 4]);
    expect(totalPages).toBe(3);
    expect(hasNext).toBe(true);
    expect(hasPrev).toBe(true);
  });
});

describe('computeBucketCounts', () => {
  it('counts all, open, and closed before bucket filter', () => {
    const rows = [
      ticket({ status: 'open' }),
      ticket({ ticketId: 'jira_X-2', externalId: 'X-2', status: 'in_progress' }),
      ticket({ ticketId: 'jira_X-3', externalId: 'X-3', status: 'closed' }),
    ];
    expect(computeBucketCounts(rows)).toEqual({ all: 3, open: 2, closed: 1 });
  });
});

describe('computeTicketFacets', () => {
  it('counts projects and mine without mine filter applied', () => {
    const rows = [
      ticket(),
      ticket({
        ticketId: 'jira_TILMS-2',
        externalId: 'TILMS-2',
        priority: 'critical',
      }),
      ticket({ ticketId: 'hd_1', source: 'helpdesk', externalId: '1', priority: 'critical' }),
    ];
    const facets = computeTicketFacets(rows, { priority: 'high' }, { email: 'tech@usd.dev' });
    expect(facets.projects).toEqual({ TILMS: 1 });
    expect(facets.mineCount).toBe(1);
    expect(facets.priorities.high).toBe(1);
    expect(facets.viewCounts.all).toBeGreaterThanOrEqual(1);
  });

  it('includes bucketCounts unaffected by bucket filter param', () => {
    const rows = [
      ticket({ status: 'open' }),
      ticket({ ticketId: 'jira_X-2', externalId: 'X-2', status: 'closed' }),
    ];
    const facets = computeTicketFacets(rows, { bucket: 'closed' });
    expect(facets.bucketCounts).toEqual({ all: 2, open: 1, closed: 1 });
  });
});
