import type { TicketApiDto } from '@usd/shared-types';
import { Badge, SlaBar, StatusDot, priorityColors, usdColors } from '@usd/ui';
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
 * Ticket card matching design reference with real API fields.
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

  return (
    <article
      className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 transition-shadow hover:shadow-md"
      style={{ borderTopWidth: 3, borderTopColor: accent }}
    >
      <div
        className={`mb-2.5 flex items-start justify-between gap-2 ${onOpenDetail !== undefined ? 'cursor-pointer' : ''}`}
        onClick={openDetail}
        onKeyDown={onKey}
        role={onOpenDetail !== undefined ? 'button' : undefined}
        tabIndex={onOpenDetail !== undefined ? 0 : undefined}
      >
        <h3 className="flex-1 text-sm font-bold leading-snug text-gray-900">{ticket.summary}</h3>
        <div className="flex items-center gap-2">
          {!isJira ? <SentimentBadge sentiment={ticket.sentiment} /> : null}
          <TriageScoreRing score={triageScore} />
          <Badge label={ticket.priority} color={priorityColors[ticket.priority] ?? usdColors.gray} sm />
        </div>
      </div>

      <div
        className={`mb-3 grid grid-cols-2 gap-x-2.5 gap-y-1.5 text-xs ${onOpenDetail !== undefined ? 'cursor-pointer' : ''}`}
        onClick={openDetail}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Source</div>
          <div className="flex items-center gap-1 font-semibold">
            <StatusDot color={accent} size={8} />
            {isJira ? 'Jira' : 'ManageEngine'}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</div>
          <span className="inline-block rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-semibold capitalize">
            {formatStatusLabel(ticket.status)}
          </span>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Assignee</div>
          <span className="font-semibold">{formatAssignee(ticket.assigneeId)}</span>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Ticket ID</div>
          <span className="font-semibold">{formatTicketDisplayId(ticket)}</span>
        </div>
      </div>

      <div className={`mb-3 ${onOpenDetail !== undefined ? 'cursor-pointer' : ''}`} onClick={openDetail}>
        <SlaBar value={sla} />
      </div>

      <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2.5">
        <span className="flex-1" />
        {externalUrl !== undefined ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => { e.stopPropagation(); }}
            className="rounded-md border px-2.5 py-1 text-[11px] font-bold"
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
            className="rounded-md border px-2.5 py-1 text-[11px] font-bold text-white"
            style={{ borderColor: isJira ? usdColors.blue : usdColors.indigo, backgroundColor: isJira ? usdColors.blue : usdColors.indigo }}
          >
            {isJira ? 'Comment' : 'Reply'}
          </button>
        ) : null}
        {onOpenDetail !== undefined ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetail();
            }}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700"
          >
            Details
          </button>
        ) : null}
      </div>
    </article>
  );
}
