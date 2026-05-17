import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAiInvoke } from './useAI.js';

vi.mock('../api/ai.js', () => ({
  invokeAi: vi.fn().mockResolvedValue({ engineerAction: 'Check DB' }),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAiInvoke', () => {
  it('mutates successfully', async () => {
    const { result } = renderHook(() => useAiInvoke(), { wrapper });
    result.current.mutate({ feature: 'triage_suggest', ticketId: 'hd_1' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
