import { describe, expect, it, vi } from 'vitest';
import { ticketsListResponseSchema } from '@usd/shared-types';
import * as ticketsApi from './tickets';
import { apiClient } from './client';
import { defaultTicketListPagination, emptyTicketListFacets } from '../test/ticket-list-fixtures';

describe('fetchTicketsList', () => {
  it('parses API response with pagination and facets', async () => {
    const payload = ticketsListResponseSchema.parse({
      data: [
        {
          ticketId: 'jira_A-1',
          orgId: 'o',
          source: 'jira',
          externalId: 'A-1',
          summary: 'S',
          priority: 'low',
          status: 'open',
          createdAt: 'c',
          updatedAt: 'u',
        },
      ],
      pagination: defaultTicketListPagination({ total: 1, totalPages: 1 }),
      facets: emptyTicketListFacets({ viewCounts: { all: 1, mine: 0, jira: 1, me: 0 } }),
    });
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: payload });
    const out = await ticketsApi.fetchTicketsList({ page: 1, limit: 10 });
    expect(spy).toHaveBeenCalledWith('/api/tickets', { params: { page: 1, limit: 10 } });
    expect(out.data).toHaveLength(1);
    expect(out.pagination.total).toBe(1);
    expect(out.facets.viewCounts.jira).toBe(1);
  });
});

describe('fetchTicketComments', () => {
  it('parses API response', async () => {
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { data: [], total: 0 },
    });
    const out = await ticketsApi.fetchTicketComments('jira_A-1');
    expect(spy).toHaveBeenCalledWith('/api/tickets/jira_A-1/comments');
    expect(out.total).toBe(0);
  });
});
