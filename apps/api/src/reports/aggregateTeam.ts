import type { SlaPolicy, SupportTicketRecord, TeamPerformanceRow } from '@usd/shared-types';
import { estimateSlaPercentRemaining, resolveSlaDueAt } from '../utils/sla.js';

const OPEN_STATUSES = new Set(['open', 'in_progress', 'pending']);

/**
 * Builds per-assignee performance rows for the lookback window.
 */
export function aggregateTeamPerformance(
  tickets: SupportTicketRecord[],
  policy: SlaPolicy,
  periodDays: 7 | 30,
  nowMs: number = Date.now(),
): TeamPerformanceRow[] {
  const startMs = nowMs - periodDays * 24 * 60 * 60 * 1000;
  const byAssignee = new Map<
    string,
    {
      assigned: number;
      resolved: number;
      resolutionHours: number[];
      slaMet: number;
      slaTotal: number;
    }
  >();

  const ensure = (key: string) => {
    const existing = byAssignee.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const bucket = {
      assigned: 0,
      resolved: 0,
      resolutionHours: [] as number[],
      slaMet: 0,
      slaTotal: 0,
    };
    byAssignee.set(key, bucket);
    return bucket;
  };

  for (const t of tickets) {
    const assignee = t.assigneeId?.trim() ?? 'Unassigned';
    const created = new Date(t.createdAt).getTime();
    if (created >= startMs && OPEN_STATUSES.has(t.status)) {
      ensure(assignee).assigned += 1;
    }
    if ((t.status === 'resolved' || t.status === 'closed') && created >= startMs) {
      const bucket = ensure(assignee);
      bucket.resolved += 1;
      const resolvedMs = new Date(t.updatedAt).getTime();
      const hours = (resolvedMs - created) / (60 * 60 * 1000);
      if (Number.isFinite(hours) && hours >= 0) {
        bucket.resolutionHours.push(hours);
      }
      const dueAt = resolveSlaDueAt(t, policy);
      const pct = estimateSlaPercentRemaining(t.createdAt, dueAt, resolvedMs);
      if (pct !== null) {
        bucket.slaTotal += 1;
        if (pct > 0) {
          bucket.slaMet += 1;
        }
      }
    }
  }

  return [...byAssignee.entries()]
    .map(([assignee, b]) => {
      const avgResolutionHours =
        b.resolutionHours.length > 0
          ? Math.round(
              (b.resolutionHours.reduce((s, h) => s + h, 0) / b.resolutionHours.length) * 10,
            ) / 10
          : null;
      const slaMetPercent =
        b.slaTotal > 0 ? Math.round((b.slaMet / b.slaTotal) * 100) : null;
      return {
        assignee,
        assigned: b.assigned,
        resolved: b.resolved,
        avgResolutionHours,
        slaMetPercent,
      };
    })
    .sort((a, b) => b.resolved - a.resolved);
}
