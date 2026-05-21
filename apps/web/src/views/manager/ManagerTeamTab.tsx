import type { TicketApiDto } from '@usd/shared-types';
import type { ReactElement } from 'react';
import {
  aggregateTeamByAssignee,
  formatPriorityLabel,
  hasAssignedTickets,
} from '../../utils/team-metrics';

export type ManagerTeamTabProps = {
  tickets: TicketApiDto[];
};

/**
 * Team tab table derived from the live ticket list (no extra API).
 */
export function ManagerTeamTab(props: ManagerTeamTabProps): ReactElement {
  const { tickets } = props;

  if (!hasAssignedTickets(tickets)) {
    return <p className="text-sm text-gray-500">No team data available</p>;
  }

  const rows = aggregateTeamByAssignee(tickets);

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Technician workload from {String(tickets.length)} tickets in the current queue.
      </p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Technician</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Open</th>
              <th className="px-3 py-2">Resolved</th>
              <th className="px-3 py-2">Avg Priority</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.technician} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900">{row.technician}</td>
                <td className="px-3 py-2">{row.assigned}</td>
                <td className="px-3 py-2">{row.open}</td>
                <td className="px-3 py-2">{row.resolved}</td>
                <td className="px-3 py-2 capitalize">{formatPriorityLabel(row.avgPriority)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
