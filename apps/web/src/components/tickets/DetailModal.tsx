import type { TicketApiDto } from '@usd/shared-types';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { postTicketCrossLink } from '../../api/tickets';
import { usePostTicketComment, useTicketComments, useTicketDetail } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/auth.store';

const priorityClass: Record<TicketApiDto['priority'], string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-white',
  low: 'bg-slate-500 text-white',
};

const statusClass: Record<TicketApiDto['status'], string> = {
  open: 'border border-blue-300 bg-blue-50 text-blue-900',
  in_progress: 'border border-amber-300 bg-amber-50 text-amber-900',
  pending: 'border border-zinc-300 bg-zinc-200 text-zinc-900',
  resolved: 'border border-emerald-300 bg-emerald-50 text-emerald-900',
  closed: 'border border-slate-300 bg-slate-100 text-slate-800',
};

/**
 * Returns true when the ticket description should appear in the conversation thread.
 */
export function hasDisplayableDescription(description: string | undefined): boolean {
  if (description === undefined) {
    return false;
  }
  const trimmed = description.trim();
  return trimmed.length > 0 && trimmed !== '—';
}

/**
 * Thread label for the ticket's original description by source system.
 */
export function originalDescriptionLabel(source: TicketApiDto['source']): string {
  return source === 'helpdesk' ? 'Original Request' : 'Issue Description';
}

/**
 * Formats an ISO timestamp for display in the conversation thread (stable en-US locale).
 */
export function formatTicketTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export type DetailModalProps = {
  ticketId: string | null;
  open: boolean;
  onClose: () => void;
};

/**
 * Full ticket inspector with mirrored comments and cross-link controls.
 */
export function DetailModal(props: DetailModalProps): ReactElement {
  const { ticketId, open, onClose } = props;
  const activeTicketId = open && ticketId !== null ? ticketId : undefined;
  const detailQuery = useTicketDetail(activeTicketId);
  const commentsQuery = useTicketComments(activeTicketId);
  const postComment = usePostTicketComment(activeTicketId);
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);

  const [commentDraft, setCommentDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkErr, setLinkErr] = useState<string | null>(null);

  if (!open || ticketId === null) {
    return <></>;
  }

  const ticket = detailQuery.data?.data;
  const comments = commentsQuery.data?.data ?? [];
  const originalDescriptionEntry =
    ticket !== undefined && hasDisplayableDescription(ticket.description) ? ticket : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <dialog open className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {ticket?.summary ?? 'Loading ticket…'}
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-600">{ticketId}</p>
          </div>
          <button
            type="button"
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              onClose();
              setCommentDraft('');
              setLinkDraft('');
              setLinkErr(null);
            }}
          >
            Close
          </button>
        </div>

        {ticket !== undefined ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                ticket.source === 'jira' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
              }`}
            >
              {ticket.source === 'jira' ? 'Jira' : 'Helpdesk'}
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${priorityClass[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass[ticket.status]}`}>
              {ticket.status}
            </span>
          </div>
        ) : null}

        <section className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-800">Conversation</h3>
          <ul className="mt-3 space-y-3">
            {originalDescriptionEntry !== undefined ? (
              <li
                data-testid="ticket-original-description"
                className="rounded border border-slate-200 bg-slate-100 p-3 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">
                    {originalDescriptionLabel(originalDescriptionEntry.source)}
                  </span>
                  <time dateTime={originalDescriptionEntry.createdAt}>
                    {formatTicketTimestamp(originalDescriptionEntry.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-800">
                  {originalDescriptionEntry.description}
                </p>
              </li>
            ) : null}
            {comments.map((c) => (
              <li key={c.commentId} className="rounded border border-slate-100 bg-slate-50 p-3 text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{c.createdAt}</span>
                  {c.authorEmail !== undefined ? <span>{c.authorEmail}</span> : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-800">{c.body}</p>
              </li>
            ))}
          </ul>
          {comments.length === 0 && originalDescriptionEntry === undefined ? (
            <p className="mt-2 text-xs text-slate-500">No comments yet.</p>
          ) : null}

          <div className="mt-4 space-y-2">
            <textarea
              className="min-h-[96px] w-full rounded border border-slate-300 p-2 text-sm"
              placeholder="Write a comment…"
              value={commentDraft}
              onChange={(e) => {
                setCommentDraft(e.target.value);
              }}
              disabled={postComment.isPending}
            />
            <button
              type="button"
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={postComment.isPending || commentDraft.trim().length === 0}
              onClick={() => {
                void postComment.mutateAsync(commentDraft.trim()).then(() => {
                  setCommentDraft('');
                });
              }}
            >
              Post Comment
            </button>
          </div>
        </section>

        <section className="mt-6 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-medium text-slate-800">Cross-link</h3>
          <p className="mt-1 text-xs text-slate-500">
            Link this ticket with its counterpart (`jira_*` ↔ `hd_*`) in the same org.
          </p>
          {ticket?.linkedTicketId !== undefined ? (
            <p className="mt-2 text-sm text-slate-700">
              Linked to{' '}
              <span className="font-mono">{ticket.linkedTicketId}</span>
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded border border-slate-300 px-2 py-2 text-sm"
              placeholder="Other ticket id (e.g. hd_501)"
              value={linkDraft}
              onChange={(e) => {
                setLinkDraft(e.target.value);
              }}
            />
            <button
              type="button"
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={() => {
                setLinkErr(null);
                void postTicketCrossLink(ticketId, linkDraft.trim())
                  .then(async () => {
                    setLinkDraft('');
                    await qc.invalidateQueries({ queryKey: ['ticket', orgId, ticketId] });
                    await qc.invalidateQueries({ queryKey: ['tickets', orgId] });
                  })
                  .catch(() => {
                    setLinkErr('Unable to link tickets (sources must differ).');
                  });
              }}
            >
              Link tickets
            </button>
          </div>
          {linkErr !== null ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {linkErr}
            </p>
          ) : null}
        </section>
      </dialog>
    </div>
  );
}
