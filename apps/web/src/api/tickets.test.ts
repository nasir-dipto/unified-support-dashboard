import { describe, expect, it, vi } from 'vitest';
import { ticketsListResponseSchema } from '@usd/shared-types';
import * as ticketsApi from './tickets';
import { apiClient } from './client';

describe('fetchTicketsList', () => {
  it('parses API response', async () => {
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
      total: 1,
    });
    const spy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: payload });
    const out = await ticketsApi.fetchTicketsList();
    expect(spy).toHaveBeenCalledWith('/api/tickets', { params: undefined });
    expect(out.data).toHaveLength(1);
    expect(out.data[0]?.ticketId).toBe('jira_A-1');
  });
});
