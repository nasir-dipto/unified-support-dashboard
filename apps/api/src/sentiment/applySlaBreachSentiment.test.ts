import { describe, expect, it } from 'vitest';
import { applySlaBreachSentiment } from './applySlaBreachSentiment.js';

describe('applySlaBreachSentiment', () => {
  const nowMs = new Date('2026-06-08T12:00:00.000Z').getTime();

  it('upgrades positive sentiment to negative when SLA is past due', () => {
    const result = applySlaBreachSentiment(
      {
        status: 'open',
        createdAt: '2026-06-01T00:00:00.000Z',
        slaDueAt: '2026-06-03T19:36:40.801Z',
        priority: 'medium',
      },
      { sentiment: 'positive', sentimentScore: 0.55, churnRisk: false },
      nowMs,
    );
    expect(result.sentiment).toBe('negative');
    expect(result.sentimentScore).toBeLessThan(0);
    expect(result.churnRisk).toBe(true);
  });

  it('leaves sentiment unchanged when SLA is not yet due', () => {
    const neutral = { sentiment: 'neutral' as const, sentimentScore: 0.05, churnRisk: false };
    const result = applySlaBreachSentiment(
      {
        status: 'open',
        createdAt: '2026-06-01T00:00:00.000Z',
        slaDueAt: '2026-06-10T00:00:00.000Z',
        priority: 'low',
      },
      neutral,
      nowMs,
    );
    expect(result).toEqual(neutral);
  });

  it('skips closed tickets', () => {
    const positive = { sentiment: 'positive' as const, sentimentScore: 0.55, churnRisk: false };
    const result = applySlaBreachSentiment(
      {
        status: 'closed',
        createdAt: '2026-06-01T00:00:00.000Z',
        slaDueAt: '2026-06-03T00:00:00.000Z',
        priority: 'high',
      },
      positive,
      nowMs,
    );
    expect(result).toEqual(positive);
  });
});
