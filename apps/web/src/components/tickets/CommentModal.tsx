import type { TicketApiDto } from '@usd/shared-types';
import { Badge, Overlay, priorityColors, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useAiInvoke } from '../../hooks/useAI';
import { usePostTicketComment } from '../../hooks/useTickets';
import {
  formatStatusLabel,
  sourceAccentColor,
  statusColor,
  ticketExternalUrl,
} from '../../utils/ticket-display';

export type CommentModalProps = {
  ticket: TicketApiDto | null;
  onClose: () => void;
};

/**
 * Quick comment / reply modal with AI draft via POST /api/ai/invoke.
 */
export function CommentModal(props: CommentModalProps): ReactElement {
  const { ticket, onClose } = props;
  const [text, setText] = useState('');
  const postComment = usePostTicketComment(ticket?.ticketId);
  const ai = useAiInvoke();

  if (ticket === null) {
    return <></>;
  }

  const isJira = ticket.source === 'jira';
  const accent = sourceAccentColor(ticket.source);
  const externalUrl = ticketExternalUrl(ticket);

  const draftAi = (): void => {
    void ai.mutateAsync({ feature: 'comment_draft', ticketId: ticket.ticketId }).then((res) => {
      if ('draft' in res) {
        setText(res.draft);
      }
    });
  };

  const send = (): void => {
    const body = text.trim();
    if (body.length === 0) {
      return;
    }
    void postComment.mutateAsync(body).then(() => {
      setText('');
      onClose();
    });
  };

  return (
    <Overlay
      title={`${ticket.externalId} — ${isJira ? 'Add comment' : 'Reply'}`}
      onClose={onClose}
      width={560}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge label={formatStatusLabel(ticket.status)} color={statusColor(ticket.status)} sm />
        <Badge label={ticket.priority} color={priorityColors[ticket.priority] ?? usdColors.gray} sm />
        {externalUrl !== undefined ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto rounded-lg border px-3 py-1 text-xs font-bold"
            style={{ borderColor: accent, color: accent }}
          >
            {isJira ? 'Open in Jira' : 'Open in ME'}
          </a>
        ) : null}
      </div>
      {ticket.description !== undefined && ticket.description.length > 0 ? (
        <p className="mb-3 rounded-lg bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700">
          {ticket.description}
        </p>
      ) : null}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-bold text-gray-900">
          {isJira ? 'Add internal comment' : 'Reply to customer'}
        </span>
        <button
          type="button"
          disabled={ai.isPending}
          onClick={draftAi}
          className="rounded-md px-3 py-1 text-xs font-bold text-white disabled:opacity-70"
          style={{ backgroundColor: usdColors.indigo }}
        >
          {ai.isPending ? 'Generating…' : 'AI draft'}
        </button>
      </div>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => { setText(e.target.value); }}
        placeholder={isJira ? 'Add an internal comment…' : 'Type your reply…'}
        className="w-full resize-y rounded-lg border border-gray-200 p-3 text-[13px] outline-none focus:border-usd-indigo"
      />
      {ai.isError ? (
        <p className="mt-1 text-xs text-usd-red" role="alert">
          AI draft unavailable. Enter your comment manually.
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-semibold">
          Cancel
        </button>
        <button
          type="button"
          disabled={postComment.isPending || text.trim().length === 0}
          onClick={send}
          className="rounded-lg px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: isJira ? usdColors.blue : usdColors.indigo }}
        >
          {postComment.isPending ? 'Posting…' : isJira ? 'Post comment' : 'Send reply'}
        </button>
      </div>
    </Overlay>
  );
}
