import { z } from 'zod';

/** Ticket origin system (Jira or Helpdesk). */
export const ticketSourceSchema = z.enum(['jira', 'helpdesk']);

/** Normalized priority for USD. */
export const ticketPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

/** Normalized lifecycle status (includes Helpdesk-style pending / on hold). */
export const ticketStatusSchema = z.enum([
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed',
]);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

/**
 * Stored ticket shape in `support_tickets` (DynamoDB item).
 */
export const supportTicketRecordSchema = z.object({
  ticketId: z.string().min(1),
  orgId: z.string().min(1),
  source: ticketSourceSchema,
  externalId: z.string().min(1),
  /** ManageEngine SDP internal request id (required for REST paths like `/requests/{id}/notes`). */
  internalId: z.string().min(1).optional(),
  summary: z.string(),
  description: z.string().optional(),
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
  /** Requester email from Helpdesk (`request.requester.email_id`). */
  customerEmail: z.string().min(1).optional(),
  /** Cross-system link: paired Helpdesk ↔ Jira ticket id in same org (`hd_*` / `jira_*`). */
  linkedTicketId: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type SupportTicketRecord = z.infer<typeof supportTicketRecordSchema>;

/**
 * Public ticket DTO returned by GET /api/tickets (list + detail).
 */
export const ticketApiDtoSchema = supportTicketRecordSchema.pick({
  ticketId: true,
  orgId: true,
  source: true,
  externalId: true,
  internalId: true,
  summary: true,
  description: true,
  priority: true,
  status: true,
  assigneeId: true,
  reporterId: true,
  customerEmail: true,
  linkedTicketId: true,
  createdAt: true,
  updatedAt: true,
});

export type TicketApiDto = z.infer<typeof ticketApiDtoSchema>;

export const ticketsListResponseSchema = z.object({
  data: z.array(ticketApiDtoSchema),
  cursor: z.string().optional(),
  total: z.number().int().nonnegative(),
});

export type TicketsListResponse = z.infer<typeof ticketsListResponseSchema>;

export const ticketDetailResponseSchema = z.object({
  data: ticketApiDtoSchema,
});

export type TicketDetailResponse = z.infer<typeof ticketDetailResponseSchema>;

export const ticketsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(100),
  cursor: z.string().min(1).optional(),
});

export type TicketsListQuery = z.infer<typeof ticketsListQuerySchema>;

const jiraUserRefSchema = z
  .object({
    accountId: z.string().optional(),
    displayName: z.string().optional(),
  })
  .passthrough();

const jiraIssueFieldsSchema = z
  .object({
    summary: z.string().optional(),
    description: z.union([z.string(), z.object({}).passthrough(), z.null()]).optional(),
    priority: z
      .object({
        name: z.string().optional(),
      })
      .nullable()
      .optional(),
    status: z
      .object({
        name: z.string().optional(),
      })
      .nullable()
      .optional(),
    assignee: jiraUserRefSchema.nullable().optional(),
    reporter: jiraUserRefSchema.nullable().optional(),
  })
  .passthrough();

/**
 * Minimal Jira issue object used for webhook + REST mapping.
 */
export const jiraIssueSchema = z
  .object({
    key: z.string().min(1),
    fields: jiraIssueFieldsSchema.optional().default({}),
  })
  .passthrough();

export type JiraIssue = z.infer<typeof jiraIssueSchema>;

/**
 * Jira webhook POST JSON (subset; unknown keys ignored until parsed).
 */
export const jiraWebhookBodySchema = z
  .object({
    webhookEvent: z.string().optional(),
    issue: jiraIssueSchema.optional(),
  })
  .passthrough();

export type JiraWebhookBody = z.infer<typeof jiraWebhookBodySchema>;

/** Origin of a row in `support_ticket_comments`. */
export const commentSourceSchema = z.enum([
  'jira_comment',
  'hd_note',
  'hd_email',
  'usd_comment',
]);

export type CommentSource = z.infer<typeof commentSourceSchema>;

/** Upstream action when posting a new comment through USD. */
export const commentReplyKindSchema = z.enum(['jira_comment', 'hd_note', 'hd_email']);

export type CommentReplyKind = z.infer<typeof commentReplyKindSchema>;

/** Stored USD comment on a ticket (`support_ticket_comments`). */
export const supportTicketCommentRecordSchema = z.object({
  orgId: z.string().min(1),
  /** Sort key: `${ticketId}#${commentId}` */
  ticketCommentKey: z.string().min(1),
  ticketId: z.string().min(1),
  commentId: z.string().min(1),
  body: z.string(),
  commentSource: commentSourceSchema,
  /** External id from Jira/HD for idempotent sync (optional for USD-authored rows). */
  sourceCommentId: z.string().min(1).optional(),
  authorUserId: z.string().min(1).optional(),
  authorEmail: z.string().min(1).optional(),
  authorDisplayName: z.string().min(1).optional(),
  createdAt: z.string().min(1),
});

export type SupportTicketCommentRecord = z.infer<typeof supportTicketCommentRecordSchema>;

/** Comment returned by GET /api/tickets/:id/comments */
export const ticketCommentApiDtoSchema = supportTicketCommentRecordSchema.omit({
  orgId: true,
  ticketCommentKey: true,
});

export type TicketCommentApiDto = z.infer<typeof ticketCommentApiDtoSchema>;

export const ticketCommentsListResponseSchema = z.object({
  data: z.array(ticketCommentApiDtoSchema),
  total: z.number().int().nonnegative(),
});

export type TicketCommentsListResponse = z.infer<typeof ticketCommentsListResponseSchema>;

export const postTicketCommentBodySchema = z.object({
  body: z.string().min(1).max(16000),
  /** Defaults: Jira → `jira_comment`, Helpdesk → `hd_note`. */
  replyKind: commentReplyKindSchema.optional(),
});

export type PostTicketCommentBody = z.infer<typeof postTicketCommentBodySchema>;

export const postTicketCommentResponseSchema = z.object({
  data: ticketCommentApiDtoSchema,
});

export type PostTicketCommentResponse = z.infer<typeof postTicketCommentResponseSchema>;

export const ticketCrossLinkBodySchema = z.object({
  linkedTicketId: z.string().min(1),
});

export type TicketCrossLinkBody = z.infer<typeof ticketCrossLinkBodySchema>;

export const ticketCrossLinkResponseSchema = z.object({
  data: z.object({
    ticket: ticketApiDtoSchema,
    linkedTicket: ticketApiDtoSchema,
  }),
});

export type TicketCrossLinkResponse = z.infer<typeof ticketCrossLinkResponseSchema>;
