import type { TicketApiDto } from '@usd/shared-types';
import { StatCard, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { isTicketAssignedToCurrentUser } from '../../utils/ticket-display';

export type TicketStatsRowProps = {
  tickets: TicketApiDto[];
};

const openStatuses: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];

/**
 * Stat cards row derived from the loaded ticket list.
 */
export function TicketStatsRow(props: TicketStatsRowProps): ReactElement {
  const { tickets } = props;
  const user = useAuthStore((s) => s.user);
  const assignedToMe = tickets.filter((t) => isTicketAssignedToCurrentUser(t, user));
  const open = tickets.filter((t) => openStatuses.includes(t.status));
  const critical = tickets.filter((t) => t.priority === 'critical');
  const jira = tickets.filter((t) => t.source === 'jira');
  const me = tickets.filter((t) => t.source === 'helpdesk');

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Assigned to me" value={assignedToMe.length} color={usdColors.blue} />
      <StatCard label="Open" value={open.length} color={usdColors.green} />
      <StatCard label="Critical" value={critical.length} color={usdColors.red} />
      <StatCard label="Jira tickets" value={jira.length} color={usdColors.purple} />
      <StatCard label="ME tickets" value={me.length} color={usdColors.teal} />
    </div>
  );
}
