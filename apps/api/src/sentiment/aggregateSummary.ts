import type {
  CustomerSentimentRow,
  PrioritySentimentBreakdown,
  SentimentCount,
  SentimentSummaryResponse,
  SentimentTicketRow,
  SentimentTrendPoint,
  SupportTicketRecord,
  TicketPriority,
  TicketSentiment,
} from '@usd/shared-types';
import { sentimentSummaryResponseSchema } from '@usd/shared-types';

const PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];
const WEEKS = 7;

/**
 * Returns ISO date string for Monday (UTC) of the week containing `iso`.
 */
export function weekStartUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds chart-ready sentiment summary from Helpdesk ticket records.
 */
export function buildSentimentSummary(
  tickets: SupportTicketRecord[],
  filterSentiment?: TicketSentiment,
): SentimentSummaryResponse {
  const hd = tickets.filter((t) => t.source === 'helpdesk');
  const counts: SentimentCount = {
    positive: 0,
    neutral: 0,
    negative: 0,
    unanalyzed: 0,
  };

  for (const t of hd) {
    if (t.sentiment === 'positive') {
      counts.positive += 1;
    } else if (t.sentiment === 'neutral') {
      counts.neutral += 1;
    } else if (t.sentiment === 'negative') {
      counts.negative += 1;
    } else {
      counts.unanalyzed += 1;
    }
  }

  const now = new Date();
  const weekKeys: string[] = [];
  for (let i = WEEKS - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weekKeys.push(weekStartUtc(d.toISOString()));
  }

  const trendMap = new Map<string, SentimentTrendPoint>();
  for (const w of weekKeys) {
    trendMap.set(w, { weekStart: w, positive: 0, neutral: 0, negative: 0, avgScore: 0 });
  }

  const scoresByWeek = new Map<string, number[]>();

  for (const t of hd) {
    if (t.sentiment === undefined || t.sentiment === null) {
      continue;
    }
    const anchor = t.sentimentAt ?? t.updatedAt;
    const wk = weekStartUtc(anchor);
    const point = trendMap.get(wk);
    if (point !== undefined) {
      if (t.sentiment === 'positive') {
        point.positive += 1;
      } else if (t.sentiment === 'neutral') {
        point.neutral += 1;
      } else {
        point.negative += 1;
      }
      if (t.sentimentScore !== undefined && t.sentimentScore !== null) {
        const arr = scoresByWeek.get(wk) ?? [];
        arr.push(t.sentimentScore);
        scoresByWeek.set(wk, arr);
      }
    }
  }

  const trend: SentimentTrendPoint[] = weekKeys.map((wk) => {
    const point = trendMap.get(wk) ?? {
      weekStart: wk,
      positive: 0,
      neutral: 0,
      negative: 0,
      avgScore: 0,
    };
    const scores = scoresByWeek.get(wk) ?? [];
    if (scores.length > 0) {
      point.avgScore =
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    }
    return point;
  });

  const customerMap = new Map<
    string,
    { scores: number[]; sentiments: TicketSentiment[]; churn: number }
  >();

  for (const t of hd) {
    const email = t.customerEmail ?? 'unknown@customer';
    const entry = customerMap.get(email) ?? { scores: [], sentiments: [], churn: 0 };
    if (t.sentimentScore !== undefined && t.sentimentScore !== null) {
      entry.scores.push(t.sentimentScore);
    }
    if (t.sentiment !== undefined && t.sentiment !== null) {
      entry.sentiments.push(t.sentiment);
    }
    if (t.churnRisk === true) {
      entry.churn += 1;
    }
    customerMap.set(email, entry);
  }

  const byCustomer: CustomerSentimentRow[] = [...customerMap.entries()]
    .map(([customerEmail, data]) => {
      const avgScore =
        data.scores.length > 0
          ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
          : 0;
      const neg = data.sentiments.filter((s) => s === 'negative').length;
      const pos = data.sentiments.filter((s) => s === 'positive').length;
      const sentiment: TicketSentiment =
        neg > pos ? 'negative' : pos > neg ? 'positive' : 'neutral';
      const label = customerEmail.includes('@')
        ? customerEmail.split('@')[0] ?? customerEmail
        : customerEmail;
      return {
        customerEmail,
        customerLabel: label,
        sentiment,
        avgScore: Math.round(avgScore * 100) / 100,
        ticketCount: data.sentiments.length,
        churnRiskCount: data.churn,
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 20);

  const byPriority: PrioritySentimentBreakdown[] = PRIORITIES.map((priority) => {
    const subset = hd.filter((t) => t.priority === priority);
    return {
      priority,
      positive: subset.filter((t) => t.sentiment === 'positive').length,
      neutral: subset.filter((t) => t.sentiment === 'neutral').length,
      negative: subset.filter((t) => t.sentiment === 'negative').length,
    };
  });

  let ticketRows: SentimentTicketRow[] = hd
    .filter((t) => t.sentiment !== undefined && t.sentiment !== null)
    .map((t) => ({
      ticketId: t.ticketId,
      externalId: t.externalId,
      summary: t.summary,
      priority: t.priority,
      status: t.status,
      customerEmail: t.customerEmail,
      sentiment: t.sentiment ?? null,
      sentimentScore: t.sentimentScore ?? null,
      churnRisk: t.churnRisk,
      sentimentAt: t.sentimentAt ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

  if (filterSentiment !== undefined) {
    ticketRows = ticketRows.filter((t) => t.sentiment === filterSentiment);
  }

  ticketRows = ticketRows
    .sort((a, b) => (a.sentimentScore ?? 0) - (b.sentimentScore ?? 0))
    .slice(0, 50);

  return sentimentSummaryResponseSchema.parse({
    counts,
    trend,
    byCustomer,
    byPriority,
    tickets: ticketRows,
    total: hd.length,
  });
}

/**
 * Serializes org metrics for the morning briefing prompt.
 */
export function formatSummaryForBriefing(
  summary: SentimentSummaryResponse,
  openCritical: number,
): string {
  const lines = [
    `Helpdesk tickets: ${String(summary.total)}`,
    `Sentiment — positive: ${String(summary.counts.positive)}, neutral: ${String(summary.counts.neutral)}, negative: ${String(summary.counts.negative)}, unanalyzed: ${String(summary.counts.unanalyzed)}`,
    `Open critical (all sources): ${String(openCritical)}`,
    `Churn-risk flags: ${String(summary.tickets.filter((t) => t.churnRisk === true).length)}`,
  ];
  const topRisk = summary.byCustomer.slice(0, 5);
  if (topRisk.length > 0) {
    lines.push('At-risk customers:');
    for (const c of topRisk) {
      lines.push(`- ${c.customerLabel}: avg ${String(c.avgScore)}, ${String(c.ticketCount)} tickets`);
    }
  }
  return lines.join('\n');
}
