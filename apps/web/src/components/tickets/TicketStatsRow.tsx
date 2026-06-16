import type { TicketsListFacets } from '@usd/shared-types';
import { StatCard, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';

export type TicketStatsRowProps = {
  facets: TicketsListFacets | undefined;
  /** Filtered ticket total from pagination (for accessibility; stats use facets). */
  total?: number;
  /** When true, first stat shows assigned ticket count labeled "My Tickets". */
  technicianOnly?: boolean;
};

const openStatuses = ['open', 'in_progress', 'pending'] as const;

/**
 * Stat cards row derived from API list facets (org-wide counts for active filters).
 */
export function TicketStatsRow(props: TicketStatsRowProps): ReactElement {
  const { facets, technicianOnly = false } = props;
  const firstLabel = technicianOnly ? 'My Tickets' : 'Assigned to me';
  const mine = facets?.mineCount ?? 0;
  const open =
    facets === undefined
      ? 0
      : openStatuses.reduce((sum, s) => sum + facets.statuses[s], 0);
  const critical = facets?.priorities.critical ?? 0;
  const jira = facets?.sources.jira ?? 0;
  const me = facets?.sources.helpdesk ?? 0;

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard compact label={firstLabel} value={mine} color={usdColors.blue} />
      <StatCard compact label="Open" value={open} color={usdColors.green} />
      <StatCard compact label="Critical" value={critical} color={usdColors.red} />
      <StatCard compact label="Jira tickets" value={jira} color={usdColors.purple} />
      <StatCard compact label="ME tickets" value={me} color={usdColors.teal} />
    </div>
  );
}
