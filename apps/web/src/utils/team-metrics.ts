import type { TicketApiDto, TicketPriority } from '@usd/shared-types';

const OPEN_STATUSES: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];
const RESOLVED_STATUSES: TicketApiDto['status'][] = ['resolved', 'closed'];

const PRIORITY_RANK: Record<TicketPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const RANK_TO_PRIORITY: TicketPriority[] = ['low', 'medium', 'high', 'critical'];

export type TeamAssigneeRow = {
  technician: string;
  assigned: number;
  open: number;
  resolved: number;
  avgPriority: TicketPriority;
};

/**
 * Returns true when at least one ticket has a non-empty assignee.
 */
export function hasAssignedTickets(tickets: TicketApiDto[]): boolean {
  return tickets.some((t) => {
    const id = t.assigneeId?.trim();
    return id !== undefined && id.length > 0;
  });
}

/**
 * Computes average priority label from ticket priorities (ordinal mean).
 */
export function averagePriorityLabel(priorities: TicketPriority[]): TicketPriority {
  if (priorities.length === 0) {
    return 'medium';
  }
  const avg =
    priorities.reduce((sum, p) => sum + PRIORITY_RANK[p], 0) / priorities.length;
  const idx = Math.round(avg) - 1;
  return RANK_TO_PRIORITY[Math.max(0, Math.min(RANK_TO_PRIORITY.length - 1, idx))] ?? 'medium';
}

/**
 * Groups tickets by assigneeId into team table rows (excludes unassigned).
 */
export function aggregateTeamByAssignee(tickets: TicketApiDto[]): TeamAssigneeRow[] {
  const byAssignee = new Map<string, TicketApiDto[]>();

  for (const ticket of tickets) {
    const key = ticket.assigneeId?.trim();
    if (key === undefined || key.length === 0) {
      continue;
    }
    const bucket = byAssignee.get(key) ?? [];
    bucket.push(ticket);
    byAssignee.set(key, bucket);
  }

  return [...byAssignee.entries()]
    .map(([technician, group]) => ({
      technician,
      assigned: group.length,
      open: group.filter((t) => OPEN_STATUSES.includes(t.status)).length,
      resolved: group.filter((t) => RESOLVED_STATUSES.includes(t.status)).length,
      avgPriority: averagePriorityLabel(group.map((t) => t.priority)),
    }))
    .sort((a, b) => b.assigned - a.assigned);
}

/**
 * Capitalizes priority for table display.
 */
export function formatPriorityLabel(priority: TicketPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}
