import { describe, expect, it } from 'vitest';
import { hdTimestampToIso, parseHdTimestamp, parseJiraTimestamp } from './sourceTimestamps.js';

describe('parseJiraTimestamp', () => {
  it('parses Jira ISO created field', () => {
    const iso = parseJiraTimestamp('2026-03-01T10:15:30.000+0000', 'fallback');
    expect(iso).toBe('2026-03-01T10:15:30.000Z');
  });

  it('falls back when missing', () => {
    expect(parseJiraTimestamp(undefined, '2020-01-01T00:00:00.000Z')).toBe(
      '2020-01-01T00:00:00.000Z',
    );
  });
});

describe('hdTimestampToIso', () => {
  it('converts Unix ms in value wrapper', () => {
    const iso = hdTimestampToIso({ value: 1_736_000_000_000 }, 'fallback');
    expect(iso).toBe(new Date(1_736_000_000_000).toISOString());
  });

  it('falls back when invalid', () => {
    expect(hdTimestampToIso(null, '2020-01-01T00:00:00.000Z')).toBe('2020-01-01T00:00:00.000Z');
  });

  it('converts SDP created_time object with epoch value string', () => {
    const iso = hdTimestampToIso(
      { display_value: 'Jun 2, 2023 04:59 PM', value: '1685721558093' },
      'fallback',
    );
    expect(iso).toBe(new Date(1685721558093).toISOString());
  });

  it('parseHdTimestamp returns null for missing fields', () => {
    expect(parseHdTimestamp(null)).toBeNull();
    expect(parseHdTimestamp(undefined)).toBeNull();
  });

  it('uses display_value when value is missing', () => {
    const iso = hdTimestampToIso({ display_value: 'Jun 2, 2023 04:59 PM' }, 'fallback');
    expect(iso).not.toBe('fallback');
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false);
  });
});
