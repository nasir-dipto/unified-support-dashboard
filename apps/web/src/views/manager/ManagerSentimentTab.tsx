import type { TicketSentiment } from '@usd/shared-types';
import { Pill, StatCard, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { CategorySentimentChart } from '../../components/sentiment/CategorySentimentChart';
import { CustomerSentimentChart } from '../../components/sentiment/CustomerSentimentChart';
import { SentimentTrendChart } from '../../components/sentiment/SentimentTrendChart';
import { TicketsBySentimentChart } from '../../components/sentiment/TicketsBySentimentChart';
import { useAiInvoke } from '../../hooks/useAI';
import { useSentimentSummary } from '../../hooks/useSentiment';

export type ManagerSentimentTabProps = {
  onSelectTicket?: (ticketId: string) => void;
};

const FILTERS: { id: 'all' | TicketSentiment; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'negative', label: 'Negative' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'positive', label: 'Positive' },
];

/**
 * Sentiment analysis tab with Recharts and AI morning briefing.
 */
export function ManagerSentimentTab(props: ManagerSentimentTabProps): ReactElement {
  const { onSelectTicket } = props;
  const [filter, setFilter] = useState<'all' | TicketSentiment>('all');
  const [briefing, setBriefing] = useState<string | null>(null);
  const ai = useAiInvoke();
  const query = useSentimentSummary(
    filter === 'all' ? undefined : { sentiment: filter },
  );
  const data = query.data;

  const generateBriefing = (): void => {
    setBriefing(null);
    void ai.mutateAsync({ feature: 'morning_briefing' }).then((res) => {
      if ('briefing' in res) {
        setBriefing(res.briefing);
      }
    });
  };

  if (query.isLoading) {
    return <p className="text-sm text-gray-500">Loading sentiment data…</p>;
  }

  if (data === undefined) {
    return <p className="text-sm text-gray-500">Unable to load sentiment summary.</p>;
  }

  const atRisk = data.byCustomer.filter(
    (c) => c.sentiment === 'negative' && c.churnRiskCount > 0,
  ).length;

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        Sentiment analysis applies to ManageEngine tickets only.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Negative" value={data.counts.negative} color={usdColors.red} sub="ME tickets" />
        <StatCard label="Neutral" value={data.counts.neutral} color={usdColors.amber} sub="ME tickets" />
        <StatCard label="Positive" value={data.counts.positive} color={usdColors.teal} sub="ME tickets" />
        <StatCard
          label="At-risk accounts"
          value={atRisk}
          color={usdColors.coral}
          sub={`${String(data.total)} helpdesk tickets`}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Pill
            key={f.id}
            label={f.label}
            active={filter === f.id}
            onClick={() => { setFilter(f.id); }}
          />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Trend — 7 weeks</h3>
          <SentimentTrendChart data={data.trend} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">AI briefing</h3>
            <button
              type="button"
              disabled={ai.isPending}
              onClick={generateBriefing}
              className="rounded-lg bg-usd-indigo px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {ai.isPending ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {briefing !== null ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700">{briefing}</pre>
          ) : (
            <p className="text-sm italic text-gray-400">Click Generate for today&apos;s summary.</p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Tickets by sentiment</h3>
          <TicketsBySentimentChart counts={data.counts} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-900">By Priority</h3>
          <CategorySentimentChart data={data.byPriority} />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-900">Per-customer breakdown</h3>
        <CustomerSentimentChart rows={data.byCustomer} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-bold text-gray-900">
          Tickets ({filter === 'all' ? 'all sentiments' : filter}) — up to 50
        </h3>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {data.tickets.map((t) => (
            <li key={t.ticketId}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => { onSelectTicket?.(t.ticketId); }}
              >
                <span className="font-bold text-usd-blue">HD-{t.externalId}</span>
                <span className="flex-1 truncate">{t.summary}</span>
                <span className="text-xs capitalize text-gray-500">{t.sentiment ?? '—'}</span>
              </button>
            </li>
          ))}
          {data.tickets.length === 0 ? (
            <li className="text-sm text-gray-400">No tickets match this filter.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
