import { describe, expect, it } from 'vitest';
import { formatJiraProjectSyncLine } from './jira-reconcile.js';
import { parseSyncCliArgs } from './syncCliArgs.js';

describe('jira-reconcile CLI', () => {
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

describe('formatJiraProjectSyncLine', () => {
  it('formats zero-ticket projects', () => {
    expect(formatJiraProjectSyncLine('TPDI', { fetched: 0, upserted: 0, skipped: 0 })).toBe(
      '  TPDI: 0 tickets',
    );
  });

  it('formats projects with fetched tickets', () => {
    expect(formatJiraProjectSyncLine('SPROJ', { fetched: 2, upserted: 2, skipped: 0 })).toBe(
      '  SPROJ: 2 tickets fetched, 2 upserted, 0 skipped',
    );
  });
});
