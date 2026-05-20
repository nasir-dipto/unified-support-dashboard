import { describe, expect, it } from 'vitest';
import { isEligibleForSentimentAnalysis, SENTIMENT_MIN_INTERVAL_MS } from './eligibility.js';

describe('isEligibleForSentimentAnalysis', () => {
  const now = Date.parse('2026-05-20T12:00:00.000Z');

  it('allows when sentimentAt is missing', () => {
    expect(isEligibleForSentimentAnalysis(undefined, now)).toBe(true);
    expect(isEligibleForSentimentAnalysis(null, now)).toBe(true);
  });

  it('blocks when analyzed within the last hour', () => {
    const recent = new Date(now - 30 * 60 * 1000).toISOString();
    expect(isEligibleForSentimentAnalysis(recent, now)).toBe(false);
  });

  it('allows when last analysis was over an hour ago', () => {
    const old = new Date(now - SENTIMENT_MIN_INTERVAL_MS - 1000).toISOString();
    expect(isEligibleForSentimentAnalysis(old, now)).toBe(true);
  });
});
