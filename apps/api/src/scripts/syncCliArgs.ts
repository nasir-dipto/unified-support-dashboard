/** Default lookback window when `--incremental` is passed without `--since`. */
export const DEFAULT_INCREMENTAL_SINCE_MINUTES = 15;

export type SyncCliMode = 'full' | 'incremental';

export type ParsedSyncCliArgs = {
  mode: SyncCliMode;
  /** Set when mode is incremental (minutes to look back). */
  sinceMinutes?: number;
};

/**
 * Parses `--incremental` and `--since=N` flags for Jira/HD reconcile scripts.
 * Default: full sync (no time filter).
 */
export function parseSyncCliArgs(argv: readonly string[]): ParsedSyncCliArgs {
  let sinceMinutes: number | undefined;

  for (const arg of argv) {
    if (arg === '--incremental') {
      if (sinceMinutes === undefined) {
        sinceMinutes = DEFAULT_INCREMENTAL_SINCE_MINUTES;
      }
    } else if (arg.startsWith('--since=')) {
      const raw = arg.slice('--since='.length);
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --since value: ${raw}`);
      }
      sinceMinutes = Math.floor(parsed);
    }
  }

  if (sinceMinutes !== undefined) {
    return { mode: 'incremental', sinceMinutes };
  }
  return { mode: 'full' };
}
