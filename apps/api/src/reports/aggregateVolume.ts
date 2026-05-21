import type { SupportTicketRecord, VolumeTrendPoint } from '@usd/shared-types';

/**
 * Builds daily ticket volume points for the lookback window.
 */
export function aggregateVolumeTrend(
  tickets: SupportTicketRecord[],
  periodDays: 7 | 30,
  nowMs: number = Date.now(),
): VolumeTrendPoint[] {
  const startMs = nowMs - periodDays * 24 * 60 * 60 * 1000;
  const byDate = new Map<string, { jira: number; helpdesk: number }>();

  for (let d = 0; d < periodDays; d += 1) {
    const day = new Date(startMs + d * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    byDate.set(key, { jira: 0, helpdesk: 0 });
  }

  for (const t of tickets) {
    const created = new Date(t.createdAt).getTime();
    if (created < startMs || created > nowMs) {
      continue;
    }
    const key = t.createdAt.slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket === undefined) {
      continue;
    }
    if (t.source === 'jira') {
      bucket.jira += 1;
    } else {
      bucket.helpdesk += 1;
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date,
      jira: counts.jira,
      helpdesk: counts.helpdesk,
      total: counts.jira + counts.helpdesk,
    }));
}
