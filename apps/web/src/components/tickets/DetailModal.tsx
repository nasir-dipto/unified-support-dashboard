import type {
  CommentDraftTone,
  CommentReplyKind,
  KbDraftResponse,
  KbSearchResult,
  TicketApiDto,
  TriageSuggestResponse,
} from '@usd/shared-types';
import { Badge, Overlay, Pill, SlaBar, priorityColors, usdColors } from '@usd/ui';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { postTicketCrossLink } from '../../api/tickets';
import { KbDraftForm } from '../kb/KbDraftForm';
import { KbSearchResults } from '../kb/KbSearchResults';
import { useAiInvoke } from '../../hooks/useAI';
import { useKbDraft, useKbSearch } from '../../hooks/useKb';
import { useHealthDetail } from '../../hooks/useHealthDetail';
import { usePostTicketComment, useTicketComments, useTicketDetail } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/auth.store';
import {
  commentSourceColor,
  commentSourceLabel,
  HD_EMAIL_REPLY_DISABLED_TOOLTIP,
  sortThreadComments,
} from '../../utils/comment-display';
import {
  estimateSlaPercentRemaining,
  formatAssignee,
  formatCustomer,
  formatStatusLabel,
  sourceAccentColor,
  statusColor,
  ticketExternalUrl,
} from '../../utils/ticket-display';

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
 * Full ticket inspector with AI triage, comments, and cross-link.
 */
export function DetailModal(props: DetailModalProps): ReactElement {
  const { ticketId, open, onClose } = props;
  const activeTicketId = open && ticketId !== null ? ticketId : undefined;
  const detailQuery = useTicketDetail(activeTicketId);
  const commentsQuery = useTicketComments(activeTicketId);
  const postComment = usePostTicketComment(activeTicketId);
  const healthQuery = useHealthDetail(open);
  const ai = useAiInvoke();
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);

  const [commentDraft, setCommentDraft] = useState('');
  const [draftTone, setDraftTone] = useState<CommentDraftTone>('professional');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TriageSuggestResponse | null>(null);
  const [kbResults, setKbResults] = useState<KbSearchResult[]>([]);
  const [kbDraft, setKbDraft] = useState<KbDraftResponse | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const kbSearch = useKbSearch(ticketId ?? undefined);
  const kbDraftMut = useKbDraft();

  if (!open || ticketId === null) {
    return <></>;
  }

  const ticket = detailQuery.data?.data;
  const comments = sortThreadComments(commentsQuery.data?.data ?? []);
  const emailReplyEnabled = healthQuery.data?.helpdesk.emailReplyEnabled ?? false;
  const originalDescriptionEntry =
    ticket !== undefined && hasDisplayableDescription(ticket.description) ? ticket : undefined;

  const sla =
    ticket !== undefined
      ? estimateSlaPercentRemaining(ticket.createdAt, ticket.updatedAt)
      : 0;
  const accent = ticket !== undefined ? sourceAccentColor(ticket.source) : usdColors.blue;
  const externalUrl = ticket !== undefined ? ticketExternalUrl(ticket) : undefined;

  const askAi = (): void => {
    if (ticket === undefined) {
      return;
    }
    setSuggestion(null);
    void ai
      .mutateAsync({ feature: 'triage_suggest', ticketId: ticket.ticketId })
      .then((res) => {
        if ('engineerAction' in res) {
          setSuggestion(res);
        }
      })
      .catch(() => {
        setSuggestion({
          engineerAction: 'AI suggestion unavailable. Review ticket manually.',
          degraded: true,
        });
      });
  };

  const openStatuses: TicketApiDto['status'][] = ['open', 'in_progress', 'pending'];
  const kbSearchNote =
    ticket !== undefined && openStatuses.includes(ticket.status)
      ? 'Best results on resolved tickets'
      : undefined;

  const searchKb = (): void => {
    if (ticket === undefined) {
      return;
    }
    setKbResults([]);
    void kbSearch.mutateAsync().then((data) => {
      setKbResults(data);
    });
  };

  const generateKbDraft = (): void => {
    if (ticket === undefined || draftSaved) {
      return;
    }
    setKbDraft(null);
    void kbDraftMut.mutateAsync(ticket.ticketId).then((draft) => {
      setKbDraft(draft);
    });
  };

  const kbGenerateTooltip = draftSaved
    ? 'KB draft already saved for this ticket. Edit in Admin → Knowledge Base'
    : undefined;

  const draftCommentAi = (): void => {
    if (ticket === undefined) {
      return;
    }
    void ai
      .mutateAsync({
        feature: 'comment_draft',
        ticketId: ticket.ticketId,
        tone: draftTone,
      })
      .then((res) => {
        if ('draft' in res) {
          setCommentDraft(res.draft);
        }
      });
  };

  const close = (): void => {
    onClose();
    setCommentDraft('');
    setLinkDraft('');
    setLinkErr(null);
    setSuggestion(null);
    setKbResults([]);
    setKbDraft(null);
    setDraftSaved(false);
  };

  const submitReply = (replyKind: CommentReplyKind): void => {
    const body = commentDraft.trim();
    if (body.length === 0) {
      return;
    }
    void postComment.mutateAsync({ body, replyKind }).then(() => {
      setCommentDraft('');
    });
  };

  return (
    <Overlay title={ticket?.externalId ?? ticketId} sub={ticket?.summary} onClose={close} width={520}>
      {ticket !== undefined ? (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge label={formatStatusLabel(ticket.status)} color={statusColor(ticket.status)} />
            <Badge label={ticket.priority} color={priorityColors[ticket.priority] ?? usdColors.gray} />
            <Badge label={ticket.source === 'jira' ? 'Jira' : 'ManageEngine'} color={accent} />
          </div>


          <div className="mb-3 grid grid-cols-2 gap-2">
            {[
              ['Assignee', formatAssignee(ticket.assigneeId)],
              ['Customer', formatCustomer(ticket)],
              ['Created', formatTicketTimestamp(ticket.createdAt)],
              ['Updated', formatTicketTimestamp(ticket.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</div>
                <div className="text-[13px] font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">SLA health</div>
            <SlaBar value={sla} />
          </div>

          {ticket.linkedTicketId !== undefined ? (
            <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[13px]">
              Linked: <span className="font-bold text-usd-blue">{ticket.linkedTicketId}</span>
            </p>
          ) : null}

          {externalUrl !== undefined ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-3 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: accent, color: accent }}
            >
              {ticket.source === 'jira' ? 'Open in Jira' : 'Open in ManageEngine'}
            </a>
          ) : null}

          <button
            type="button"
            disabled={ai.isPending}
            onClick={askAi}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-bold text-white disabled:opacity-75"
            style={{ backgroundColor: usdColors.indigo }}
          >
            {ai.isPending ? 'Generating…' : 'AI: suggest action'}
          </button>

          {suggestion !== null ? (
            <div className="mb-4 border-t border-gray-100 pt-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Recommended action
                {suggestion.degraded === true ? (
                  <span className="ml-2 font-normal normal-case text-amber-600">(degraded)</span>
                ) : null}
              </div>
              <p className="rounded-lg bg-gray-50 p-3 text-[13px]">{suggestion.engineerAction}</p>
              {suggestion.suggestedAssignee !== undefined ? (
                <p className="mt-2 text-xs text-gray-600">
                  Suggested assignee:{' '}
                  <span className="font-semibold">{suggestion.suggestedAssignee}</span>
                </p>
              ) : null}
              {suggestion.riskLevel !== undefined ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2">
                  <Badge
                    label={`Risk: ${suggestion.riskLevel}`}
                    color={
                      suggestion.riskLevel === 'HIGH'
                        ? usdColors.red
                        : suggestion.riskLevel === 'MED'
                          ? usdColors.amber
                          : usdColors.teal
                    }
                    sm
                  />
                  {suggestion.riskReason !== undefined ? (
                    <span className="text-xs text-gray-500">{suggestion.riskReason}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-500">Loading ticket…</p>
      )}

      <section className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900">Conversation</h3>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {originalDescriptionEntry !== undefined ? (
            <li
              data-testid="ticket-original-description"
              className="rounded-lg border border-gray-200 bg-gray-100 p-3 text-sm"
            >
              <div className="flex justify-between text-xs text-gray-500">
                <span className="font-medium">{originalDescriptionLabel(originalDescriptionEntry.source)}</span>
                <time dateTime={originalDescriptionEntry.createdAt}>
                  {formatTicketTimestamp(originalDescriptionEntry.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{originalDescriptionEntry.description}</p>
            </li>
          ) : null}
          {comments.map((c) => (
            <li key={c.commentId} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <Badge
                  label={commentSourceLabel(c.commentSource)}
                  color={commentSourceColor(c.commentSource)}
                  sm
                />
                <time dateTime={c.createdAt}>{formatTicketTimestamp(c.createdAt)}</time>
              </div>
              {(c.authorDisplayName !== undefined || c.authorEmail !== undefined) ? (
                <p className="mt-1 text-xs text-gray-500">
                  {c.authorDisplayName ?? c.authorEmail}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Draft tone
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(['professional', 'empathetic', 'technical'] as const).map((tone) => (
                <Pill
                  key={tone}
                  label={tone.charAt(0).toUpperCase() + tone.slice(1)}
                  active={draftTone === tone}
                  onClick={() => { setDraftTone(tone); }}
                />
              ))}
            </div>
          </div>
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-gray-200 p-2 text-sm"
            placeholder={
              ticket?.source === 'jira' ? 'Add an internal comment…' : 'Write a note or reply…'
            }
            value={commentDraft}
            onChange={(e) => { setCommentDraft(e.target.value); }}
            disabled={postComment.isPending}
          />
          <button
            type="button"
            disabled={ai.isPending || ticket === undefined}
            onClick={draftCommentAi}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-bold text-indigo-900 disabled:opacity-60"
          >
            {ai.isPending ? 'Generating draft…' : 'AI: draft comment'}
          </button>
          <div className="flex flex-wrap gap-2">
            {ticket?.source === 'jira' ? (
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: usdColors.blue }}
                disabled={postComment.isPending || commentDraft.trim().length === 0}
                onClick={() => { submitReply('jira_comment'); }}
              >
                Comment
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: usdColors.purple }}
                  disabled={postComment.isPending || commentDraft.trim().length === 0}
                  onClick={() => { submitReply('hd_note'); }}
                >
                  Add Note
                </button>
                <button
                  type="button"
                  title={emailReplyEnabled ? undefined : HD_EMAIL_REPLY_DISABLED_TOOLTIP}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: usdColors.teal }}
                  disabled={
                    !emailReplyEnabled ||
                    postComment.isPending ||
                    commentDraft.trim().length === 0
                  }
                  onClick={() => { submitReply('hd_email'); }}
                >
                  Reply to Customer
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900">Knowledge base</h3>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={kbSearch.isPending || ticket === undefined}
            onClick={searchKb}
            className="flex-1 rounded-lg border border-teal-200 bg-teal-50 py-2 text-sm font-bold text-teal-900 disabled:opacity-60"
          >
            {kbSearch.isPending ? 'Searching…' : 'Search KB'}
          </button>
          <button
            type="button"
            disabled={draftSaved || kbDraftMut.isPending || ticket === undefined}
            title={kbGenerateTooltip}
            onClick={generateKbDraft}
            className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-bold text-indigo-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {kbDraftMut.isPending ? 'Generating…' : 'Generate KB Draft'}
          </button>
        </div>
        <div className="mt-3">
          <KbSearchResults
            results={kbResults}
            loading={kbSearch.isPending}
            note={kbSearchNote}
          />
        </div>
        {kbDraft !== null ? (
          <div className="mt-3">
            <KbDraftForm
              draft={kbDraft}
              saved={draftSaved}
              onSaved={() => { setDraftSaved(true); }}
            />
          </div>
        ) : null}
      </section>

      <section className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900">Cross-link</h3>
        <p className="mt-1 text-xs text-gray-500">
          Link this ticket with its counterpart (jira_* ↔ hd_*) in the same org.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-sm"
            placeholder="Other ticket id (e.g. hd_501)"
            value={linkDraft}
            onChange={(e) => { setLinkDraft(e.target.value); }}
          />
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold"
            onClick={() => {
              setLinkErr(null);
              void postTicketCrossLink(ticketId, linkDraft.trim())
                .then(async () => {
                  setLinkDraft('');
                  await qc.invalidateQueries({ queryKey: ['ticket', orgId, ticketId] });
                  await qc.invalidateQueries({ queryKey: ['tickets', orgId] });
                })
                .catch(() => { setLinkErr('Unable to link tickets (sources must differ).'); });
            }}
          >
            Link tickets
          </button>
        </div>
        {linkErr !== null ? (
          <p className="mt-2 text-xs text-usd-red" role="alert">
            {linkErr}
          </p>
        ) : null}
      </section>
    </Overlay>
  );
}
