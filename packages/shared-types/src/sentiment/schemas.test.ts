import { describe, expect, it } from 'vitest';
import { sentimentSummaryResponseSchema } from './schemas.js';

describe('sentimentSummaryResponseSchema', () => {
  it('parses minimal summary payload', () => {
    const p = sentimentSummaryResponseSchema.parse({
      counts: { positive: 1, neutral: 2, negative: 3, unanalyzed: 0 },
      trend: [{ weekStart: '2026-03-01', positive: 1, neutral: 0, negative: 2, avgScore: -0.2 }],
      byCustomer: [],
      byPriority: [{ priority: 'high', positive: 0, neutral: 0, negative: 1 }],
      tickets: [],
      total: 6,
    });
    expect(p.total).toBe(6);
  });
});
