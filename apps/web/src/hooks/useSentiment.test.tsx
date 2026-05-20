import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSentimentSummary } from './useSentiment';

vi.mock('../store/auth.store', () => ({
  useAuthStore: (sel: (s: { user?: { orgId: string } }) => unknown) =>
    sel({ user: { orgId: 'demo-org' } }),
}));

vi.mock('../api/sentiment', () => ({
  getSentimentSummary: vi.fn().mockResolvedValue({
    counts: { positive: 0, neutral: 0, negative: 1, unanalyzed: 0 },
    trend: [],
    byCustomer: [],
    byPriority: [],
    tickets: [],
    total: 1,
  }),
}));

describe('useSentimentSummary', () => {
  it('fetches summary', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useSentimentSummary(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => {
      expect(result.current.data?.total).toBe(1);
    });
  });
});
