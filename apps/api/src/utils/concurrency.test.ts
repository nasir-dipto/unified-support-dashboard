import { describe, expect, it } from 'vitest';
import { runWithConcurrencyLimit } from './concurrency.js';

describe('runWithConcurrencyLimit', () => {
  it('respects concurrency limit of 5', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;
    await runWithConcurrencyLimit(items, 5, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });
    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('processes all items', async () => {
    const seen: number[] = [];
    await runWithConcurrencyLimit([1, 2, 3], 2, (n) => {
      seen.push(n);
      return Promise.resolve();
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});
