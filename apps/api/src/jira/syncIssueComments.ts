import { mapJiraCommentToRecord } from './mapJiraCommentToRecord.js';
import { upsertTicketComment } from '../db/tables/comments.js';
import { fetchIssueComments } from '../services/jira.service.js';

/**
 * Syncs all Jira issue comments into `support_ticket_comments` for a USD ticket.
 */
export async function syncIssueComments(params: {
  orgId: string;
  ticketId: string;
  issueKey: string;
}): Promise<number> {
  let startAt = 0;
  const maxResults = 100;
  let synced = 0;
  let total = 0;
  do {
    const page = await fetchIssueComments(params.issueKey, { startAt, maxResults });
    total = page.total;
    for (const comment of page.comments) {
      const record = mapJiraCommentToRecord({
        orgId: params.orgId,
        ticketId: params.ticketId,
        comment,
      });
      if (record !== null) {
        await upsertTicketComment(record);
        synced += 1;
      }
    }
    if (page.comments.length === 0) {
      break;
    }
    startAt += page.comments.length;
  } while (startAt < total);
  return synced;
}
