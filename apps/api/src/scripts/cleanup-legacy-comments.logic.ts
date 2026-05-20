/** Raw comment row shape used by the legacy cleanup script (pre-parse). */
export type LegacyCommentRow = {
  orgId: string;
  ticketCommentKey: string;
  ticketId: string;
  commentId: string;
  body: string;
  commentSource?: string | null;
  sourceCommentId?: string;
};

/** One row scheduled for deletion with a human-readable reason. */
export type CommentDeletionTarget = {
  orgId: string;
  ticketCommentKey: string;
  reason: string;
};

const LEGACY_HD_TICKET_PREFIX = 'hd_4445';
const JIRA_USD_7_TICKET_ID = 'jira_USD-7';

/**
 * Returns true when `commentSource` is absent on the DynamoDB item.
 */
export function isMissingCommentSource(row: LegacyCommentRow): boolean {
  const source = row.commentSource;
  return source === undefined || source === null || source.trim().length === 0;
}

/**
 * Returns true when `commentSource` is a non-empty string on the item.
 */
export function hasProperCommentSource(row: LegacyCommentRow): boolean {
  return !isMissingCommentSource(row);
}

/**
 * Normalizes body text for duplicate detection.
 */
export function normalizeCommentBody(body: string): string {
  return body.trim();
}

/**
 * Returns true when `commentId` is the canonical synced Jira key (`jira_{sourceCommentId}`).
 */
export function isStableJiraSyncedKey(row: LegacyCommentRow): boolean {
  if (row.sourceCommentId === undefined || row.sourceCommentId.length === 0) {
    return row.commentId.startsWith('jira_');
  }
  return row.commentId === `jira_${row.sourceCommentId}`;
}

/**
 * Chooses which `jira_USD-7` row to keep when multiple share the same body (prefer stable `jira_*` key).
 */
export function pickJiraUsd7Keeper(rows: LegacyCommentRow[]): LegacyCommentRow {
  const stable = rows.filter((r) => isStableJiraSyncedKey(r));
  if (stable.length > 0) {
    return [...stable].sort((a, b) => a.commentId.localeCompare(b.commentId))[0] as LegacyCommentRow;
  }
  const jiraPrefixed = rows.filter((r) => r.commentId.startsWith('jira_'));
  if (jiraPrefixed.length > 0) {
    return [...jiraPrefixed].sort((a, b) => a.commentId.localeCompare(b.commentId))[0] as LegacyCommentRow;
  }
  return [...rows].sort((a, b) => a.commentId.localeCompare(b.commentId))[0] as LegacyCommentRow;
}

/**
 * Builds the set of comment rows to delete according to legacy cleanup rules.
 */
export function collectLegacyCommentDeletions(rows: LegacyCommentRow[]): CommentDeletionTarget[] {
  const targets: CommentDeletionTarget[] = [];
  const seenKeys = new Set<string>();

  const add = (row: LegacyCommentRow, reason: string): void => {
    if (seenKeys.has(row.ticketCommentKey)) {
      return;
    }
    seenKeys.add(row.ticketCommentKey);
    targets.push({
      orgId: row.orgId,
      ticketCommentKey: row.ticketCommentKey,
      reason,
    });
  };

  for (const row of rows) {
    if (row.ticketId.startsWith(LEGACY_HD_TICKET_PREFIX)) {
      add(row, 'legacy_hd_internal_ticket_id');
    }
  }

  const byTicketBody = new Map<string, LegacyCommentRow[]>();
  for (const row of rows) {
    const key = `${row.ticketId}\0${normalizeCommentBody(row.body)}`;
    const group = byTicketBody.get(key) ?? [];
    group.push(row);
    byTicketBody.set(key, group);
  }

  for (const group of byTicketBody.values()) {
    const withSource = group.filter((r) => hasProperCommentSource(r));
    const withoutSource = group.filter((r) => isMissingCommentSource(r));
    if (withSource.length > 0 && withoutSource.length > 0) {
      for (const row of withoutSource) {
        add(row, 'missing_commentSource_duplicate_body');
      }
    }
  }

  const usd7Rows = rows.filter((r) => r.ticketId === JIRA_USD_7_TICKET_ID);
  const usd7ByBody = new Map<string, LegacyCommentRow[]>();
  for (const row of usd7Rows) {
    const bodyKey = normalizeCommentBody(row.body);
    const group = usd7ByBody.get(bodyKey) ?? [];
    group.push(row);
    usd7ByBody.set(bodyKey, group);
  }
  for (const group of usd7ByBody.values()) {
    if (group.length <= 1) {
      continue;
    }
    const keeper = pickJiraUsd7Keeper(group);
    for (const row of group) {
      if (row.ticketCommentKey !== keeper.ticketCommentKey) {
        add(row, 'jira_USD-7_duplicate_body');
      }
    }
  }

  return targets;
}

/**
 * Parses a DynamoDB scan item into a `LegacyCommentRow` (returns null when required keys are missing).
 */
export function parseLegacyCommentRow(raw: Record<string, unknown>): LegacyCommentRow | null {
  const orgId = typeof raw.orgId === 'string' ? raw.orgId : '';
  const ticketCommentKey = typeof raw.ticketCommentKey === 'string' ? raw.ticketCommentKey : '';
  const ticketId = typeof raw.ticketId === 'string' ? raw.ticketId : '';
  const commentId = typeof raw.commentId === 'string' ? raw.commentId : '';
  const body = typeof raw.body === 'string' ? raw.body : '';
  if (
    orgId.length === 0 ||
    ticketCommentKey.length === 0 ||
    ticketId.length === 0 ||
    commentId.length === 0
  ) {
    return null;
  }
  const commentSource =
    typeof raw.commentSource === 'string'
      ? raw.commentSource
      : raw.commentSource === null
        ? null
        : undefined;
  const sourceCommentId =
    typeof raw.sourceCommentId === 'string' ? raw.sourceCommentId : undefined;
  return {
    orgId,
    ticketCommentKey,
    ticketId,
    commentId,
    body,
    commentSource,
    sourceCommentId,
  };
}
