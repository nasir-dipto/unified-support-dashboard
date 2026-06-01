import { describe, expect, it, vi } from 'vitest';
import * as concurrency from '../utils/concurrency.js';
import { HD_RECONCILE_CONCURRENCY, reconcileHelpdeskRequestRows } from './hd-reconcile.js';
import { parseSyncCliArgs } from './syncCliArgs.js';

describe('hd-reconcile CLI', () => {
  it('uses full sync by default', () => {
    expect(parseSyncCliArgs([])).toEqual({ mode: 'full' });
  });

  it('uses incremental sync with --incremental', () => {
    expect(parseSyncCliArgs(['--incremental']).mode).toBe('incremental');
  });

  it('uses custom window with --since=N', () => {
    expect(parseSyncCliArgs(['--since=20']).sinceMinutes).toBe(20);
  });
});

describe('reconcileHelpdeskRequestRows', () => {
  it('uses concurrency limit of 5', async () => {
    const spy = vi.spyOn(concurrency, 'runWithConcurrencyLimit').mockResolvedValue(undefined);
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: String(i) }));
    const stats = await reconcileHelpdeskRequestRows(rows, 'demo-org');
    expect(spy).toHaveBeenCalledWith(rows, HD_RECONCILE_CONCURRENCY, expect.any(Function));
    expect(HD_RECONCILE_CONCURRENCY).toBe(5);
    expect(stats).toEqual({ upserted: 0, skipped: 0, conversationsSyncedTickets: 0 });
    spy.mockRestore();
  });
});
