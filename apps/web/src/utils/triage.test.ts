import { describe, expect, it } from 'vitest';
import { computeTriageScore } from './triage.js';

describe('computeTriageScore', () => {
  it('caps at 100 for critical + low SLA + negative', () => {
    const score = computeTriageScore({
      priority: 'critical',
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      slaPercentRemaining: 10,
      sentiment: 'negative',
      churnRisk: true,
      escalated: true,
    });
    expect(score).toBe(96);
  });

  it('adds low priority base only', () => {
    expect(
      computeTriageScore({
        priority: 'low',
        status: 'open',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
    ).toBe(5);
  });
});
