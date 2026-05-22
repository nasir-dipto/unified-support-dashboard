import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as kbApi from '../api/kb.js';
import { usePublishedKbList } from './useKbBrowse.js';

function wrapper(children: ReactNode): ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useKbBrowse', () => {
  it('loads published articles', async () => {
    vi.spyOn(kbApi, 'listPublishedKbArticles').mockResolvedValue([]);
    const { result } = renderHook(() => usePublishedKbList(), {
      wrapper: ({ children }) => wrapper(children),
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
