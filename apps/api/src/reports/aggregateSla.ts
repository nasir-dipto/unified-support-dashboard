import type { SlaPolicy, SlaTrendPoint, SupportTicketRecord } from '@usd/shared-types';
import { estimateSlaPercentRemaining, resolveSlaDueAt } from '../utils/sla.js';

function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().slice(0, 10);
}

/**
 * Builds weekly SLA met vs breached counts for tickets resolved in each week.
 */
export function aggregateSlaTrend(
  tickets: SupportTicketRecord[],
  policy: SlaPolicy,
  periodDays: 7 | 30,
  nowMs: number = Date.now(),
): SlaTrendPoint[] {
  const startMs = nowMs - periodDays * 24 * 60 * 60 * 1000;
  const byWeek = new Map<string, { met: number; breached: number }>();

  for (const t of tickets) {
    if (t.status !== 'resolved' && t.status !== 'closed') {
      continue;
    }
    const resolvedAt = new Date(t.updatedAt).getTime();
    if (resolvedAt < startMs) {
      continue;
    }
    const dueAt = resolveSlaDueAt(t, policy);
    const pctAtClose = estimateSlaPercentRemaining(t.createdAt, dueAt, resolvedAt);
    const wk = weekKey(t.updatedAt);
    const bucket = byWeek.get(wk) ?? { met: 0, breached: 0 };
    if (pctAtClose === null || pctAtClose > 0) {
      bucket.met += 1;
    } else {
      bucket.breached += 1;
    }
    byWeek.set(wk, bucket);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({
      week,
      met: counts.met,
      breached: counts.breached,
    }));
}
