import { describe, expect, it } from 'vitest';
import { computeWsActivityExpiresAt } from './ws-activity-events.js';

describe('ws-activity-events', () => {
  it('computeWsActivityExpiresAt is 7 days ahead in epoch seconds', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const expires = computeWsActivityExpiresAt(now);
    expect(expires).toBe(Math.floor(now / 1000) + 7 * 24 * 60 * 60);
  });
});
