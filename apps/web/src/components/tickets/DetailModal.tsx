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
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { postTicketComment, postTicketCrossLink } from '../../api/tickets';
import { KbDraftForm } from '../kb/KbDraftForm';
import { KbSearchResults } from '../kb/KbSearchResults';
import { useAiInvoke } from '../../hooks/useAI';
import { useKbDraft, useKbDraftExists, useKbSearch } from '../../hooks/useKb';
import { useHealthDetail } from '../../hooks/useHealthDetail';
import {
  useLinkedTicketDetail,
  usePostTicketComment,
  useTicketComments,
  useTicketDetail,
} from '../../hooks/useTickets';
import { useAuthStore } from '../../store/auth.store';
import { MergedTicketPanels } from './MergedTicketPanels';
import { canWriteTicket } from '../../utils/permissions';
import {
  canWriteHdSide,
  canWriteJiraSide,
  canWriteMergedIncident,
  mergeThreadComments,
  resolveJiraAndHdTickets,
} from '../../utils/merged-incident';
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

const THREAD_PREVIEW_MAX_LEN = 80;

/**
 * Short single-line preview for collapsed conversation rows.
 */
export function conversationBodyPreview(body: string, maxLen = THREAD_PREVIEW_MAX_LEN): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) {
    return flat;
  }
  return `${flat.slice(0, maxLen)}…`;
}

/**
 * Picks the thread row id (description or comment) with the latest createdAt.
 */
export function newestThreadRowId(
  descriptionEntries: readonly TicketApiDto[],
  comments: readonly { commentId: string; createdAt: string }[],
): string | undefined {
  const rows: { id: string; createdAt: string }[] = [];
  for (const entry of descriptionEntries) {
    rows.push({ id: `desc-${entry.ticketId}`, createdAt: entry.createdAt });
  }
  for (const comment of comments) {
    rows.push({ id: comment.commentId, createdAt: comment.createdAt });
  }
  if (rows.length === 0) {
    return undefined;
  }
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return rows[rows.length - 1]?.id;
}

type CollapsibleThreadRowProps = {
  rowId: string;
  expanded: boolean;
  onToggle: () => void;
  header: ReactElement;
  body: string;
  className?: string;
  testId?: string;
};

/**
 * Collapsible conversation row with preview header and expandable body.
 */
function CollapsibleThreadRow(props: CollapsibleThreadRowProps): ReactElement {
  const { rowId, expanded, onToggle, header, body, className, testId } = props;
  const preview = conversationBodyPreview(body);
  const showPreview = !expanded && preview.length > 0;
  return (
    <li
      data-testid={testId}
      className={className ?? 'w-full rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm'}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={expanded}
        aria-controls={`thread-body-${rowId}`}
        onClick={onToggle}
      >
        <span className="mt-0.5 shrink-0 text-[10px] text-gray-400" aria-hidden>
          {expanded ? '▼' : '▶'}
        </span>
        <div className="min-w-0 flex-1">
          {header}
          {showPreview ? (
            <p className="mt-1 text-xs text-gray-600">{preview}</p>
          ) : null}
        </div>
      </button>
      {expanded ? (
        <p
          id={`thread-body-${rowId}`}
          className="mt-2 w-full break-words whitespace-pre-wrap pl-5 text-sm text-gray-900"
        >
          {body}
        </p>
      ) : null}
    </li>
  );
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
  const ticket = detailQuery.data?.data;
  const linkedTicketId = ticket?.linkedTicketId;
  const linkedQuery = useLinkedTicketDetail(linkedTicketId, open && linkedTicketId !== undefined);
  const linkedTicket = linkedQuery.data?.data;
  const mergedPair =
    ticket !== undefined ? resolveJiraAndHdTickets(ticket, linkedTicket) : undefined;

  const commentsQuery = useTicketComments(activeTicketId);
  const linkedCommentsQuery = useTicketComments(
    mergedPair !== undefined ? linkedTicket?.ticketId : undefined,
  );
  const postComment = usePostTicketComment(activeTicketId);
  const healthQuery = useHealthDetail(open);
  const ai = useAiInvoke();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId;

  const [commentDraft, setCommentDraft] = useState('');
  const [draftTone, setDraftTone] = useState<CommentDraftTone>('professional');
  const [linkDraft, setLinkDraft] = useState('');
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TriageSuggestResponse | null>(null);
  const [kbResults, setKbResults] = useState<KbSearchResult[]>([]);
  const [kbDraft, setKbDraft] = useState<KbDraftResponse | null>(null);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(() => new Set());
  const kbDraftExists = useKbDraftExists(activeTicketId, open);
  const draftSaved = kbDraftExists.data === true;
  const kbDraftChecking = kbDraftExists.isLoading;
  const kbSearch = useKbSearch(ticketId ?? undefined);
  const kbDraftMut = useKbDraft();

  const comments =
    open && ticketId !== null
      ? mergedPair !== undefined
        ? mergeThreadComments(
            commentsQuery.data?.data ?? [],
            linkedCommentsQuery.data?.data ?? [],
          )
        : sortThreadComments(commentsQuery.data?.data ?? [])
      : [];
  const descriptionEntries: TicketApiDto[] = [];
  if (open && ticketId !== null) {
    if (mergedPair !== undefined) {
      if (hasDisplayableDescription(mergedPair.jira.description)) {
        descriptionEntries.push(mergedPair.jira);
      }
      if (hasDisplayableDescription(mergedPair.hd.description)) {
        descriptionEntries.push(mergedPair.hd);
      }
    } else if (ticket !== undefined && hasDisplayableDescription(ticket.description)) {
      descriptionEntries.push(ticket);
    }
  }
  const newestThreadId = newestThreadRowId(descriptionEntries, comments);

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial = new Set<string>();
    if (newestThreadId !== undefined) {
      initial.add(newestThreadId);
    }
    setExpandedThreadIds(initial);
  }, [open, ticketId, newestThreadId]);

  const toggleThreadRow = (rowId: string): void => {
    setExpandedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  if (!open || ticketId === null) {
    return <></>;
  }

  const canWrite =
    ticket !== undefined &&
    user !== null &&
    (mergedPair !== undefined
      ? canWriteMergedIncident(user, mergedPair.jira, mergedPair.hd)
      : canWriteTicket(user.roles, ticket, user.email, user.displayName));
  const canWriteJira =
    mergedPair !== undefined ? canWriteJiraSide(user, mergedPair.jira) : false;
  const canWriteHd =
    mergedPair !== undefined ? canWriteHdSide(user, mergedPair.hd) : false;
  const emailReplyEnabled = healthQuery.data?.helpdesk.emailReplyEnabled ?? false;
  const showReplyActions =
    mergedPair !== undefined ? canWriteJira || canWriteHd : canWrite;

  const sla =
    ticket !== undefined
      ? estimateSlaPercentRemaining(ticket.createdAt, ticket.updatedAt, {
          dueAt: ticket.slaDueAt,
        })
      : null;
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
  };

  const submitReply = (targetTicketId: string, replyKind: CommentReplyKind): void => {
    const body = commentDraft.trim();
    if (body.length === 0) {
      return;
    }
    const post =
      targetTicketId === activeTicketId
        ? postComment.mutateAsync({ body, replyKind })
        : postTicketComment(targetTicketId, { body, replyKind }).then(async () => {
            await qc.invalidateQueries({ queryKey: ['ticket-comments', orgId, targetTicketId] });
            await qc.invalidateQueries({ queryKey: ['ticket', orgId, targetTicketId] });
          });
    void post.then(() => {
      setCommentDraft('');
      if (mergedPair !== undefined) {
        void qc.invalidateQueries({ queryKey: ['ticket-comments', orgId, activeTicketId] });
        void qc.invalidateQueries({
          queryKey: ['ticket-comments', orgId, linkedTicket?.ticketId],
        });
      }
    });
  };

  return (
    <Overlay
      title={
        mergedPair !== undefined
          ? `${mergedPair.jira.externalId} ↔ ${mergedPair.hd.externalId}`
          : (ticket?.externalId ?? ticketId)
      }
      sub={ticket?.summary}
      onClose={close}
      panelMaxWidthClass={mergedPair !== undefined ? 'max-w-6xl' : 'max-w-5xl'}
      panelMaxHeightClass="max-h-[85vh]"
    >
      {ticket !== undefined ? (
        <>
          {mergedPair !== undefined ? (
            <>
              <p className="mb-2 text-xs font-semibold text-usd-blue">Merged incident (Jira + Helpdesk)</p>
              <MergedTicketPanels pair={mergedPair} />
            </>
          ) : (
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
            </>
          )}

          {!canWrite ? (
            <p className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You have read-only access to this ticket
            </p>
          ) : null}

          {canWrite ? (
            <button
              type="button"
              disabled={ai.isPending}
              onClick={askAi}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-[10px] py-2.5 text-sm font-bold text-white disabled:opacity-75"
              style={{ backgroundColor: usdColors.indigo }}
            >
              {ai.isPending ? 'Generating…' : 'AI: suggest action'}
            </button>
          ) : null}

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

      <section className="w-full border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900">Conversation</h3>
        <ul className="mt-3 max-h-[min(50vh,32rem)] w-full space-y-2 overflow-y-auto">
          {descriptionEntries.map((entry) => {
            const rowId = `desc-${entry.ticketId}`;
            const description = entry.description ?? '';
            return (
              <CollapsibleThreadRow
                key={rowId}
                rowId={rowId}
                testId="ticket-original-description"
                expanded={expandedThreadIds.has(rowId)}
                onToggle={() => { toggleThreadRow(rowId); }}
                className="w-full rounded-lg border border-gray-200 bg-gray-100 p-3 text-sm"
                body={description}
                header={(
                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                    <span className="font-medium">
                      {originalDescriptionLabel(entry.source)}
                      {mergedPair !== undefined ? ` (${entry.externalId})` : ''}
                    </span>
                    <time dateTime={entry.createdAt}>
                      {formatTicketTimestamp(entry.createdAt)}
                    </time>
                  </div>
                )}
              />
            );
          })}
          {comments.map((c) => (
            <CollapsibleThreadRow
              key={c.commentId}
              rowId={c.commentId}
              expanded={expandedThreadIds.has(c.commentId)}
              onToggle={() => { toggleThreadRow(c.commentId); }}
              body={c.body}
              header={(
                <>
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
                </>
              )}
            />
          ))}
        </ul>
        {showReplyActions ? (
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
              mergedPair !== undefined
                ? 'Reply on Jira or Helpdesk…'
                : (ticket.source === 'jira' ? 'Add an internal comment…' : 'Write a note or reply…')
            }
            value={commentDraft}
            onChange={(e) => { setCommentDraft(e.target.value); }}
            disabled={postComment.isPending}
          />
          {canWrite ? (
            <button
              type="button"
              disabled={ai.isPending}
              onClick={draftCommentAi}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-bold text-indigo-900 disabled:opacity-60"
            >
              {ai.isPending ? 'Generating draft…' : 'AI: draft comment'}
            </button>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {mergedPair !== undefined ? (
              <>
                {canWriteJira ? (
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: usdColors.blue }}
                    disabled={postComment.isPending || commentDraft.trim().length === 0}
                    onClick={() => { submitReply(mergedPair.jira.ticketId, 'jira_comment'); }}
                  >
                    Comment (Jira)
                  </button>
                ) : null}
                {canWriteHd ? (
                  <>
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      style={{ backgroundColor: usdColors.purple }}
                      disabled={postComment.isPending || commentDraft.trim().length === 0}
                      onClick={() => { submitReply(mergedPair.hd.ticketId, 'hd_note'); }}
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
                      onClick={() => { submitReply(mergedPair.hd.ticketId, 'hd_email'); }}
                    >
                      Reply to Customer
                    </button>
                  </>
                ) : null}
              </>
            ) : ticket.source === 'jira' ? (
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: usdColors.blue }}
                disabled={postComment.isPending || commentDraft.trim().length === 0}
                onClick={() => { submitReply(ticket.ticketId, 'jira_comment'); }}
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
                  onClick={() => { submitReply(ticket.ticketId, 'hd_note'); }}
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
                  onClick={() => { submitReply(ticket.ticketId, 'hd_email'); }}
                >
                  Reply to Customer
                </button>
              </>
            )}
          </div>
        </div>
        ) : null}
      </section>

      <section className="mt-4 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900">Knowledge base</h3>
        {kbDraftChecking ? (
          <p className="mt-2 text-sm text-gray-500">Checking for existing KB draft…</p>
        ) : null}
        {!kbDraftChecking && draftSaved ? (
          <p className="mt-2 text-sm font-semibold text-teal-800" role="status">
            Draft saved — review in Admin → Knowledge Base
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={kbDraftChecking || kbSearch.isPending}
            onClick={searchKb}
            className="flex-1 rounded-lg border border-teal-200 bg-teal-50 py-2 text-sm font-bold text-teal-900 disabled:opacity-60"
          >
            {kbSearch.isPending ? 'Searching…' : 'Search KB'}
          </button>
          {canWrite ? (
            <button
              type="button"
              disabled={kbDraftChecking || draftSaved || kbDraftMut.isPending}
              title={kbGenerateTooltip}
              onClick={generateKbDraft}
              className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-bold text-indigo-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {kbDraftMut.isPending ? 'Generating…' : 'Generate KB Draft'}
            </button>
          ) : null}
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
            <KbDraftForm draft={kbDraft} saved={draftSaved} />
          </div>
        ) : null}
      </section>

      {canWrite && mergedPair === undefined ? (
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
      ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-500">Loading ticket…</p>
      )}
    </Overlay>
  );
}
