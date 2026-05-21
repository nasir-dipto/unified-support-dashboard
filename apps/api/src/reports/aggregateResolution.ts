import type { ResolutionTrendPoint, SupportTicketRecord } from '@usd/shared-types';

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Builds weekly opened vs resolved counts.
 */
export function aggregateResolutionTrend(
  tickets: SupportTicketRecord[],
  periodDays: 7 | 30,
  nowMs: number = Date.now(),
): ResolutionTrendPoint[] {
  const startMs = nowMs - periodDays * 24 * 60 * 60 * 1000;
  const byWeek = new Map<string, { opened: number; resolved: number }>();

  for (const t of tickets) {
    const created = new Date(t.createdAt).getTime();
    if (created >= startMs) {
      const wk = weekKey(t.createdAt);
      const bucket = byWeek.get(wk) ?? { opened: 0, resolved: 0 };
      bucket.opened += 1;
      byWeek.set(wk, bucket);
    }
    if (t.status === 'resolved' || t.status === 'closed') {
      const resolvedAt = new Date(t.updatedAt).getTime();
      if (resolvedAt >= startMs) {
        const wk = weekKey(t.updatedAt);
        const bucket = byWeek.get(wk) ?? { opened: 0, resolved: 0 };
        bucket.resolved += 1;
        byWeek.set(wk, bucket);
      }
    }
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({
      week,
      opened: counts.opened,
      resolved: counts.resolved,
    }));
}
