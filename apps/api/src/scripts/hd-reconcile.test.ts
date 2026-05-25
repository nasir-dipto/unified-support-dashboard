import { describe, expect, it, vi } from 'vitest';
import * as concurrency from '../utils/concurrency.js';
import { HD_RECONCILE_CONCURRENCY, reconcileHelpdeskRequestRows } from './hd-reconcile.js';

describe('reconcileHelpdeskRequestRows', () => {
  it('uses concurrency limit of 5', async () => {
    const spy = vi.spyOn(concurrency, 'runWithConcurrencyLimit').mockResolvedValue(undefined);
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: String(i) }));
    await reconcileHelpdeskRequestRows(rows, 'demo-org');
    expect(spy).toHaveBeenCalledWith(rows, HD_RECONCILE_CONCURRENCY, expect.any(Function));
    expect(HD_RECONCILE_CONCURRENCY).toBe(5);
    spy.mockRestore();
  });
});
