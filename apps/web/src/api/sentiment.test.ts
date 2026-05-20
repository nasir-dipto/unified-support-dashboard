import { describe, expect, it, vi } from 'vitest';
import { getSentimentSummary } from './sentiment.js';

const getMock = vi.fn();

vi.mock('./client.js', () => ({
  apiClient: {
    get: (url: string, opts?: { params?: unknown }) => getMock(url, opts) as Promise<{ data: unknown }>,
  },
}));

describe('getSentimentSummary', () => {
  it('parses summary response', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        counts: { positive: 1, neutral: 0, negative: 2, unanalyzed: 0 },
        trend: [],
        byCustomer: [],
        byPriority: [],
        tickets: [],
        total: 3,
      },
    });
    const res = await getSentimentSummary();
    expect(res.total).toBe(3);
    expect(getMock).toHaveBeenCalledWith('/api/sentiment/summary', { params: undefined });
  });
});
