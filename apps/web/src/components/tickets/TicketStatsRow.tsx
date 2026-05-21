import type { TicketApiDto } from '@usd/shared-types';
import { StatCard, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useAuthStore } from '../../store/auth.store';

export type TicketStatsRowProps = {
  tickets: TicketApiDto[];
};

const openStatuses: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];

/**
 * Stat cards row derived from real ticket list data.
 */
export function TicketStatsRow(props: TicketStatsRowProps): ReactElement {
  const { tickets } = props;
  const userId = useAuthStore((s) => s.user?.userId);
  const mine =
    userId !== undefined ? tickets.filter((t) => t.assigneeId === userId) : tickets;
  const open = mine.filter((t) => openStatuses.includes(t.status));
  const critical = mine.filter((t) => t.priority === 'critical');
  const jira = mine.filter((t) => t.source === 'jira');
  const me = mine.filter((t) => t.source === 'helpdesk');

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Assigned to me" value={mine.length} color={usdColors.blue} />
      <StatCard label="Open" value={open.length} color={usdColors.green} />
      <StatCard label="Critical" value={critical.length} color={usdColors.red} />
      <StatCard label="Jira tickets" value={jira.length} color={usdColors.purple} />
      <StatCard label="ME tickets" value={me.length} color={usdColors.teal} />
    </div>
  );
}
