import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as usersApi from '../api/users.js';
import { useUsers } from './useUsers.js';

function wrapper(children: ReactNode): ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useUsers', () => {
  it('loads users list', async () => {
    vi.spyOn(usersApi, 'fetchUsers').mockResolvedValue({
      data: [
        {
          userId: '1',
          email: 'a@usd.dev',
          role: 'technician',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });
    const { result } = renderHook(() => useUsers(), { wrapper: ({ children }) => wrapper(children) });
    await waitFor(() => {
      expect(result.current.data?.data).toHaveLength(1);
    });
  });
});
