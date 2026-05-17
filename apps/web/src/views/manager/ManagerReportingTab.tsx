import type { TicketApiDto } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { PanelSkeleton } from '../../components/skeletons/PanelSkeleton';

export type ManagerReportingTabProps = {
  tickets: TicketApiDto[];
};

/**
 * Reporting tab — partial real status data, charts skeleton.
 */
export function ManagerReportingTab(props: ManagerReportingTabProps): ReactElement {
  const { tickets } = props;
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Reporting uses {tickets.length} tickets from the live queue. Historical charts require Phase 8.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton title="SLA compliance — 7 days" lines={5} />
        <PanelSkeleton title="Avg resolution time" lines={6} />
        <PanelSkeleton title="Enterprise account health" lines={5} />
        <PanelSkeleton title="Backlog trend" lines={4} />
      </div>
    </div>
  );
}
