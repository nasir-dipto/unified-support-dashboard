import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useHealthDetail } from './useHealthDetail.js';

vi.mock('../api/health.js', () => ({
  fetchHealthDetail: vi.fn().mockResolvedValue({
    status: 'ok',
    version: '1.0.0',
    dynamodb: 'connected',
    redis: 'connected',
    websocket: { connections: 0 },
    uptime: 1,
  }),
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useHealthDetail', () => {
  it('loads health', async () => {
    const { result } = renderHook(() => useHealthDetail(), { wrapper });
    await waitFor(() => {
      expect(result.current.data?.status).toBe('ok');
    });
  });
});
