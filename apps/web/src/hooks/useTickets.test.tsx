import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as ticketsApi from '../api/tickets';
import { useAuthStore } from '../store/auth.store';
import { DEFAULT_TICKETS_LIST_LIMIT, useTicketsList } from './useTickets';

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
        roles: ['viewer'],
      },
    });
    const spy = vi.spyOn(ticketsApi, 'fetchTicketsList').mockResolvedValue({
      data: [],
      total: 0,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTicketsList(), {
      wrapper: wrapper(client),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(spy).toHaveBeenCalledWith({ limit: DEFAULT_TICKETS_LIST_LIMIT, cursor: undefined });
  });
});
