/**
 * Parses a Jira ISO timestamp field to UTC ISO; falls back when missing or invalid.
 */
export function parseJiraTimestamp(raw: unknown, fallbackIso: string): string {
  if (typeof raw !== 'string') {
    return fallbackIso;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fallbackIso;
  }
  const ms = new Date(trimmed).getTime();
  if (Number.isNaN(ms)) {
    return fallbackIso;
  }
  return new Date(ms).toISOString();
}

/**
 * Parses one HD timestamp candidate (epoch ms, numeric string, or display date string) to ISO UTC.
 */
function hdTimestampCandidateToIso(candidate: unknown): string | null {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return new Date(candidate).toISOString();
  }
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (/^\d+$/.test(trimmed)) {
      const ms = Number(trimmed);
      if (Number.isFinite(ms)) {
        return new Date(ms).toISOString();
      }
      return null;
    }
    const parsed = new Date(trimmed).getTime();
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return null;
}

/**
 * Parses ManageEngine `created_time` / `last_updated_time` to ISO UTC, or null when absent/invalid.
 * SDP often returns `{ value: epochMs, display_value: "Jun 2, 2023 04:59 PM" }`.
 */
export function parseHdTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const fromValue = hdTimestampCandidateToIso(o.value);
    if (fromValue !== null) {
      return fromValue;
    }
    const fromDisplay = hdTimestampCandidateToIso(o.display_value);
    if (fromDisplay !== null) {
      return fromDisplay;
    }
    return null;
  }
  return hdTimestampCandidateToIso(raw);
}

/**
 * Converts ManageEngine timestamp fields to ISO UTC with a fallback when missing/invalid.
 */
export function hdTimestampToIso(raw: unknown, fallbackIso: string): string {
  return parseHdTimestamp(raw) ?? fallbackIso;
}
