import type { TicketApiDto } from '@usd/shared-types';
import { Badge, SlaBar, priorityColors, usdColors } from '@usd/ui';
import type { ReactElement, KeyboardEvent } from 'react';
import {
  estimateSlaPercentRemaining,
  formatAssignee,
  formatStatusLabel,
  formatTicketDisplayId,
  sourceAccentColor,
  ticketExternalUrl,
} from '../../utils/ticket-display';
import { SentimentBadge } from '../sentiment/SentimentBadge';
import { computeTriageScore } from '../../utils/triage';
import { TriageScoreRing } from './TriageScoreRing';

export type TicketCardProps = {
  ticket: TicketApiDto;
  onOpenDetail?: (ticket: TicketApiDto) => void;
  onOpenComment?: (ticket: TicketApiDto) => void;
};

/**
 * Compact single-row ticket item for the technician queue list.
 */
export function TicketCard(props: TicketCardProps): ReactElement {
  const { ticket, onOpenDetail, onOpenComment } = props;
  const accent = sourceAccentColor(ticket.source);
  const isJira = ticket.source === 'jira';
  const sla = estimateSlaPercentRemaining(ticket.createdAt, ticket.updatedAt);
  const triageScore = computeTriageScore({
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    slaPercentRemaining: sla,
    sentiment: ticket.sentiment ?? undefined,
    churnRisk: ticket.churnRisk,
  });
  const externalUrl = ticketExternalUrl(ticket);

  const openDetail = (): void => {
    onOpenDetail?.(ticket);
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail();
    }
  };

  const detailInteractive = onOpenDetail !== undefined;

  return (
    <article
      className="flex items-center gap-2 border-b border-gray-100 bg-white px-2 py-1.5 last:border-b-0 transition-colors hover:bg-gray-50"
      style={{ borderLeftWidth: 3, borderLeftColor: accent }}
    >
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 ${detailInteractive ? 'cursor-pointer' : ''}`}
        onClick={detailInteractive ? openDetail : undefined}
        onKeyDown={detailInteractive ? onKey : undefined}
        role={detailInteractive ? 'button' : undefined}
        tabIndex={detailInteractive ? 0 : undefined}
      >
        <Badge
          label={isJira ? 'Jira' : 'ME'}
          color={accent}
          sm
        />
        <Badge label={ticket.priority} color={priorityColors[ticket.priority] ?? usdColors.gray} sm />
        {!isJira ? <SentimentBadge sentiment={ticket.sentiment} /> : null}
        <span className="shrink-0 font-mono text-[11px] font-bold text-gray-500">
          {formatTicketDisplayId(ticket)}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-900">
          {ticket.summary}
        </h3>
        <span className="hidden max-w-[100px] shrink-0 truncate text-[11px] font-medium text-gray-600 md:inline">
          {formatAssignee(ticket.assigneeId)}
        </span>
        <span className="hidden shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-gray-700 lg:inline">
          {formatStatusLabel(ticket.status)}
        </span>
        <div className="hidden w-[72px] shrink-0 sm:block">
          <SlaBar value={sla} compact />
        </div>
        <TriageScoreRing score={triageScore} size={28} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {externalUrl !== undefined ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => { e.stopPropagation(); }}
            className="rounded border px-2 py-0.5 text-[10px] font-bold"
            style={{ borderColor: accent, color: accent, backgroundColor: isJira ? '#eff6ff' : '#f5f3ff' }}
          >
            {isJira ? 'Jira' : 'ME'}
          </a>
        ) : null}
        {onOpenComment !== undefined ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComment(ticket);
            }}
            className="rounded border px-2 py-0.5 text-[10px] font-bold text-white"
            style={{
              borderColor: isJira ? usdColors.blue : usdColors.indigo,
              backgroundColor: isJira ? usdColors.blue : usdColors.indigo,
            }}
          >
            {isJira ? 'Comment' : 'Reply'}
          </button>
        ) : null}
        {detailInteractive ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail();
            }}
            className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-700"
          >
            Details
          </button>
        ) : null}
      </div>
    </article>
  );
}
