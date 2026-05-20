import { describe, expect, it } from 'vitest';
import {
  collectLegacyCommentDeletions,
  isStableJiraSyncedKey,
  pickJiraUsd7Keeper,
} from './cleanup-legacy-comments.logic.js';

describe('collectLegacyCommentDeletions', () => {
  it('deletes rows with hd_4445 ticketId prefix', () => {
    const targets = collectLegacyCommentDeletions([
      {
        orgId: 'demo-org',
        ticketCommentKey: 'hd_4445000000197095#hd_1',
        ticketId: 'hd_4445000000197095',
        commentId: 'hd_1',
        body: 'old',
      },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.reason).toBe('legacy_hd_internal_ticket_id');
  });

  it('deletes missing commentSource when duplicate body has proper source', () => {
    const targets = collectLegacyCommentDeletions([
      {
        orgId: 'demo-org',
        ticketCommentKey: 'jira_SCRUM-6#01ULID',
        ticketId: 'jira_SCRUM-6',
        commentId: '01ULID',
        body: 'Test Comment',
      },
      {
        orgId: 'demo-org',
        ticketCommentKey: 'jira_SCRUM-6#jira_10000',
        ticketId: 'jira_SCRUM-6',
        commentId: 'jira_10000',
        body: 'Test Comment',
        commentSource: 'jira_comment',
        sourceCommentId: '10000',
      },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.ticketCommentKey).toBe('jira_SCRUM-6#01ULID');
    expect(targets[0]?.reason).toBe('missing_commentSource_duplicate_body');
  });

  it('dedupes jira_USD-7 identical bodies keeping stable jira key', () => {
    const rows = [
      {
        orgId: 'demo-org',
        ticketCommentKey: 'jira_USD-7#jira_10033',
        ticketId: 'jira_USD-7',
        commentId: 'jira_10033',
        body: 'Same text',
        commentSource: 'jira_comment',
        sourceCommentId: '10033',
      },
      {
        orgId: 'demo-org',
        ticketCommentKey: 'jira_USD-7#jira_10034',
        ticketId: 'jira_USD-7',
        commentId: 'jira_10034',
        body: 'Same text',
        commentSource: 'jira_comment',
        sourceCommentId: '10034',
      },
      {
        orgId: 'demo-org',
        ticketCommentKey: 'jira_USD-7#01EXTRA',
        ticketId: 'jira_USD-7',
        commentId: '01EXTRA',
        body: 'Same text',
        commentSource: 'usd_comment',
      },
    ];
    expect(pickJiraUsd7Keeper(rows.filter((r) => r.body === 'Same text'))).toMatchObject({
      commentId: 'jira_10033',
    });
    const targets = collectLegacyCommentDeletions(rows);
    const usd7Dupes = targets.filter((t) => t.reason === 'jira_USD-7_duplicate_body');
    expect(usd7Dupes).toHaveLength(2);
    expect(usd7Dupes.map((t) => t.ticketCommentKey).sort()).toEqual(
      ['jira_USD-7#01EXTRA', 'jira_USD-7#jira_10034'].sort(),
    );
  });
});

describe('isStableJiraSyncedKey', () => {
  it('matches jira_{sourceCommentId}', () => {
    expect(
      isStableJiraSyncedKey({
        orgId: 'o',
        ticketCommentKey: 'k',
        ticketId: 'jira_X',
        commentId: 'jira_9',
        body: 'b',
        sourceCommentId: '9',
      }),
    ).toBe(true);
  });
});
