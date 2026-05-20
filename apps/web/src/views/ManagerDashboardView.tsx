import type { TicketApiDto } from '@usd/shared-types';
import { StatCard, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { DetailModal } from '../components/tickets/DetailModal';
import { useTicketsList } from '../hooks/useTickets';
import { estimateSlaPercentRemaining } from '../utils/ticket-display';
import { ManagerInsightsTab } from './manager/ManagerInsightsTab';
import { ManagerOverviewTab } from './manager/ManagerOverviewTab';
import { ManagerReportingTab } from './manager/ManagerReportingTab';
import { useSentimentSummary } from '../hooks/useSentiment';
import { ManagerSentimentTab } from './manager/ManagerSentimentTab';
import { ManagerTeamTab } from './manager/ManagerTeamTab';

type MgrTab = 'overview' | 'sentiment' | 'insights' | 'reporting' | 'team';

const openStatuses: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];

/**
 * Manager dashboard (MgrView) with tabs; metrics from live tickets.
 */
export function ManagerDashboardView(): ReactElement {
  const { data, isLoading } = useTicketsList();
  const sentimentQuery = useSentimentSummary();
  const tickets = data?.data ?? [];
  const negativeSentiment = sentimentQuery.data?.counts.negative ?? 0;
  const [tab, setTab] = useState<MgrTab>('overview');
  const [detailId, setDetailId] = useState<string | null>(null);

  const open = tickets.filter((t) => openStatuses.includes(t.status));
  const critical = tickets.filter((t) => t.priority === 'critical');
  const avgSla =
    tickets.length > 0
      ? Math.round(
          tickets.reduce(
            (a, t) => a + estimateSlaPercentRemaining(t.createdAt, t.updatedAt),
            0,
          ) / tickets.length,
        )
      : 0;

  const tabs: { id: MgrTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'sentiment',
      label: 'Sentiment analysis',
      badge: negativeSentiment > 0 ? negativeSentiment : undefined,
    },
    { id: 'insights', label: 'AI insights' },
    { id: 'reporting', label: 'Reporting' },
    { id: 'team', label: 'Team' },
  ];

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading dashboard…</p>;
  }

  return (
    <>
      <h1 className="text-[26px] font-extrabold text-gray-900">Management Dashboard</h1>
      <p className="mb-5 text-sm text-gray-500">Overview, sentiment, reporting and AI insights.</p>

      <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-6">
        <StatCard label="Total tickets" value={tickets.length} color={usdColors.indigo} />
        <StatCard label="Open" value={open.length} color={usdColors.green} />
        <StatCard label="Critical" value={critical.length} color={usdColors.red} />
        <StatCard
          label="Negative sentiment"
          value={sentimentQuery.isLoading ? '…' : negativeSentiment}
          color={usdColors.coral}
          sub="Helpdesk"
        />
        <StatCard label="Avg SLA" value={`${String(avgSla)}%`} color={usdColors.teal} />
        <StatCard label="SLA breach risk" value="—" color={usdColors.amber} sub="Phase 8" />
      </div>

      <div className="-mb-px flex border-b-2 border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); }}
            className={`flex items-center gap-1.5 border-b-[3px] px-4 py-2.5 text-sm ${
              tab === t.id
                ? 'border-usd-indigo font-bold text-usd-indigo'
                : 'border-transparent font-medium text-gray-500'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 ? (
              <span className="rounded-full bg-usd-red px-1.5 text-[11px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' ? (
          <ManagerOverviewTab
            tickets={tickets}
            onSelectTicket={(t) => { setDetailId(t.ticketId); }}
          />
        ) : null}
        {tab === 'sentiment' ? (
          <ManagerSentimentTab onSelectTicket={(id) => { setDetailId(id); }} />
        ) : null}
        {tab === 'insights' ? <ManagerInsightsTab /> : null}
        {tab === 'reporting' ? <ManagerReportingTab tickets={tickets} /> : null}
        {tab === 'team' ? <ManagerTeamTab /> : null}
      </div>

      <DetailModal ticketId={detailId} open={detailId !== null} onClose={() => { setDetailId(null); }} />
    </>
  );
}
