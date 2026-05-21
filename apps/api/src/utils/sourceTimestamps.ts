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
 * Converts ManageEngine `created_time` / `updated_time` (often `{ value: ms }`) to ISO UTC.
 */
export function hdTimestampToIso(raw: unknown, fallbackIso: string): string {
  let candidate: unknown = raw;
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
    candidate = raw.value;
  }
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return new Date(candidate).toISOString();
  }
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (/^\d+$/.test(trimmed)) {
      const ms = Number(trimmed);
      if (Number.isFinite(ms)) {
        return new Date(ms).toISOString();
      }
    }
    const parsed = new Date(trimmed).getTime();
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return fallbackIso;
}
