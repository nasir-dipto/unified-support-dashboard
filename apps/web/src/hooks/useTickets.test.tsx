import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ticketsApi from '../api/tickets';
import { useAuthStore } from '../store/auth.store';
import { defaultTicketListPagination, emptyTicketListFacets } from '../test/ticket-list-fixtures';
import { useTicketsList } from './useTickets';

function wrapper(client: QueryClient) {
  return function W(props: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{props.children}</QueryClientProvider>;
  };
}

describe('useTicketsList', () => {
  afterEach(() => {
    useAuthStore.getState().clear();
    vi.restoreAllMocks();
  });

  it('fetches when org is present', async () => {
    useAuthStore.setState({
      accessToken: 't',
      refreshToken: 'r',
      user: {
        userId: 'u1',
        orgId: 'org-x',
        email: 'a@b.com',
        roles: ['technician'],
      },
    });
    const spy = vi.spyOn(ticketsApi, 'fetchTicketsList').mockResolvedValue({
      data: [],
      pagination: defaultTicketListPagination(),
      facets: emptyTicketListFacets(),
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const params = { page: 1, limit: 10, sort: 'newest' as const };
    const { result } = renderHook(() => useTicketsList(params), {
      wrapper: wrapper(client),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(spy).toHaveBeenCalledWith(params);
  });
});
