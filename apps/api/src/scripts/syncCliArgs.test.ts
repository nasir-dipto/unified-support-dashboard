import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INCREMENTAL_SINCE_MINUTES,
  parseSyncCliArgs,
} from './syncCliArgs.js';

describe('parseSyncCliArgs', () => {
  it('defaults to full sync when no flags', () => {
    expect(parseSyncCliArgs([])).toEqual({ mode: 'full' });
    expect(parseSyncCliArgs(['--other'])).toEqual({ mode: 'full' });
  });

  it('parses --incremental as 15 minute lookback', () => {
    expect(parseSyncCliArgs(['--incremental'])).toEqual({
      mode: 'incremental',
      sinceMinutes: DEFAULT_INCREMENTAL_SINCE_MINUTES,
    });
  });

  it('parses --since=N for custom lookback', () => {
    expect(parseSyncCliArgs(['--since=30'])).toEqual({
      mode: 'incremental',
      sinceMinutes: 30,
    });
  });

  it('lets --since override --incremental default', () => {
    expect(parseSyncCliArgs(['--incremental', '--since=45'])).toEqual({
      mode: 'incremental',
      sinceMinutes: 45,
    });
  });

  it('rejects invalid --since values', () => {
    expect(() => parseSyncCliArgs(['--since=0'])).toThrow(/Invalid --since/);
    expect(() => parseSyncCliArgs(['--since=abc'])).toThrow(/Invalid --since/);
  });
});
