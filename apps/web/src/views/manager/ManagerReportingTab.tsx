import type { ReportPeriodDays } from '@usd/shared-types';
import { Pill } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { ResolutionTrendChart } from '../../components/reports/ResolutionTrendChart';
import { SlaComplianceChart } from '../../components/reports/SlaComplianceChart';
import { TeamPerformanceTable } from '../../components/reports/TeamPerformanceTable';
import { VolumeTrendChart } from '../../components/reports/VolumeTrendChart';
import {
  useResolutionReport,
  useSlaReport,
  useTeamReport,
  useVolumeReport,
} from '../../hooks/useReports';

/**
 * Reporting tab with live Recharts from GET /api/reports/* (admin role).
 */
export function ManagerReportingTab(): ReactElement {
  const [days, setDays] = useState<ReportPeriodDays>(7);
  const volume = useVolumeReport(days);
  const resolution = useResolutionReport(days);
  const sla = useSlaReport(days);
  const team = useTeamReport(days);

  const loading =
    volume.isLoading || resolution.isLoading || sla.isLoading || team.isLoading;
  const error =
    volume.isError || resolution.isError || sla.isError || team.isError;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill label="7 days" active={days === 7} onClick={() => { setDays(7); }} />
        <Pill label="30 days" active={days === 30} onClick={() => { setDays(30); }} />
        <span className="ml-auto text-xs text-gray-400">
          CSV export: GET /api/reports/volume?format=csv (admin)
        </span>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading reports…</p> : null}
      {error ? (
        <p className="text-sm text-usd-red">
          Unable to load reports. Admin role is required for reporting APIs.
        </p>
      ) : null}
      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Ticket volume</h3>
            <VolumeTrendChart data={volume.data?.data.points ?? []} />
          </section>
          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">SLA compliance</h3>
            <SlaComplianceChart data={sla.data?.data.points ?? []} />
          </section>
          <section className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Opened vs resolved</h3>
            <ResolutionTrendChart data={resolution.data?.data.points ?? []} />
          </section>
          <section className="rounded-lg border border-gray-200 p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Team performance</h3>
            <TeamPerformanceTable rows={team.data?.data.rows ?? []} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
