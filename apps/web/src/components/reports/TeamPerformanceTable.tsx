import type { TeamPerformanceRow } from '@usd/shared-types';
import type { ReactElement } from 'react';

export type TeamPerformanceTableProps = {
  rows: TeamPerformanceRow[];
};

/**
 * Tabular team performance metrics from reports API.
 */
export function TeamPerformanceTable(props: TeamPerformanceTableProps): ReactElement {
  const { rows } = props;
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">No assignee data for this period.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Assignee</th>
            <th className="px-3 py-2">Open</th>
            <th className="px-3 py-2">Resolved</th>
            <th className="px-3 py-2">Avg resolution (h)</th>
            <th className="px-3 py-2">SLA met %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.assignee} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-900">{r.assignee}</td>
              <td className="px-3 py-2">{r.assigned}</td>
              <td className="px-3 py-2">{r.resolved}</td>
              <td className="px-3 py-2">
                {r.avgResolutionHours === null ? '—' : String(r.avgResolutionHours)}
              </td>
              <td className="px-3 py-2">
                {r.slaMetPercent === null ? '—' : `${String(r.slaMetPercent)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
