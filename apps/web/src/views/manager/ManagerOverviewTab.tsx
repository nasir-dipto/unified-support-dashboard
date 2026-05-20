import type { TicketApiDto } from '@usd/shared-types';
import { StatCard, SlaBar, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useAiInvoke } from '../../hooks/useAI';
import { estimateSlaPercentRemaining } from '../../utils/ticket-display';

export type ManagerOverviewTabProps = {
  tickets: TicketApiDto[];
  onSelectTicket: (ticket: TicketApiDto) => void;
};

const openStatuses: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];

/**
 * Manager overview with metrics derived from real tickets.
 */
export function ManagerOverviewTab(props: ManagerOverviewTabProps): ReactElement {
  const { tickets, onSelectTicket } = props;
  const [briefing, setBriefing] = useState<string | null>(null);
  const ai = useAiInvoke();
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
  const atRisk = tickets.filter(
    (t) =>
      t.priority === 'critical' ||
      estimateSlaPercentRemaining(t.createdAt, t.updatedAt) < 70,
  );

  const statusGroups: { label: string; count: number; color: string }[] = [
    { label: 'Open', count: tickets.filter((t) => t.status === 'open').length, color: usdColors.blue },
    {
      label: 'In progress',
      count: tickets.filter((t) => t.status === 'in_progress').length,
      color: usdColors.purple,
    },
    { label: 'Pending', count: tickets.filter((t) => t.status === 'pending').length, color: usdColors.amber },
    { label: 'Resolved', count: tickets.filter((t) => t.status === 'resolved').length, color: usdColors.teal },
  ];

  const generateBriefing = (): void => {
    setBriefing(null);
    void ai.mutateAsync({ feature: 'morning_briefing' }).then((res) => {
      if ('briefing' in res) {
        setBriefing(res.briefing);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="col-span-full rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Morning briefing</h3>
            <p className="text-sm text-gray-500">AI-generated summary</p>
          </div>
          <button
            type="button"
            disabled={ai.isPending}
            onClick={generateBriefing}
            className="rounded-lg bg-usd-indigo px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {ai.isPending ? 'Generating…' : 'Generate AI briefing'}
          </button>
        </div>
        <div className="mt-4">
          {briefing !== null ? (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{briefing}</pre>
          ) : (
            <p className="text-sm italic text-gray-400">
              Click Generate AI briefing for today&apos;s summary. Metrics below use live ticket data.
            </p>
          )}
          {ai.isError ? (
            <p className="mt-2 text-xs text-usd-red" role="alert">
              Briefing unavailable. Try again later.
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 font-bold text-gray-900">Ticket status</h3>
        {statusGroups.map((g) => (
          <div key={g.label} className="mb-3 flex items-center gap-3">
            <span className="w-20 text-sm text-gray-500">{g.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded"
                style={{
                  width:
                    tickets.length > 0
                      ? `${String((g.count / tickets.length) * 100)}%`
                      : '0%',
                  backgroundColor: g.color,
                }}
              />
            </div>
            <span className="min-w-[20px] text-right text-sm font-bold" style={{ color: g.color }}>
              {g.count}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-3 font-bold text-gray-900">At-risk tickets</h3>
        {atRisk.slice(0, 6).map((t) => (
          <button
            key={t.ticketId}
            type="button"
            onClick={() => { onSelectTicket(t); }}
            className="mb-2 flex w-full items-center gap-2 border-b border-gray-50 py-2 text-left text-sm hover:bg-gray-50"
          >
            <span className="min-w-[80px] font-bold text-usd-blue">{t.externalId}</span>
            <span className="flex-1 truncate">{t.summary}</span>
            <div className="w-20">
              <SlaBar value={estimateSlaPercentRemaining(t.createdAt, t.updatedAt)} />
            </div>
          </button>
        ))}
        {atRisk.length === 0 ? <p className="text-sm text-gray-400">No at-risk tickets.</p> : null}
      </div>

      <div className="col-span-full grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Open" value={open.length} color={usdColors.green} />
        <StatCard label="Critical" value={critical.length} color={usdColors.red} />
        <StatCard label="Total" value={tickets.length} color={usdColors.indigo} />
        <StatCard label="Avg SLA" value={`${String(avgSla)}%`} color={usdColors.teal} />
      </div>
    </div>
  );
}
