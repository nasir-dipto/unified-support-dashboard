import { z } from 'zod';

/** Ticket origin system (Jira or Helpdesk). */
export const ticketSourceSchema = z.enum(['jira', 'helpdesk']);

/** Customer-facing sentiment label on Helpdesk tickets. */
export const ticketSentimentSchema = z.enum(['positive', 'neutral', 'negative']);

export type TicketSentiment = z.infer<typeof ticketSentimentSchema>;

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
  /** Helpdesk-only customer sentiment (null on Jira tickets). */
  sentiment: ticketSentimentSchema.nullable().optional(),
  sentimentScore: z.number().min(-1).max(1).nullable().optional(),
  churnRisk: z.boolean().optional(),
  /** True when conversation changed and batch analysis is pending. */
  sentimentStale: z.boolean().optional(),
  /** ISO timestamp of last sentiment analysis. */
  sentimentAt: z.string().min(1).nullable().optional(),
  /** Explicit due date from source, or computed from org SLA policy. */
  slaDueAt: z.string().min(1).optional(),
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
  sentiment: true,
  sentimentScore: true,
  churnRisk: true,
  sentimentStale: true,
  sentimentAt: true,
  slaDueAt: true,
});

export type TicketApiDto = z.infer<typeof ticketApiDtoSchema>;

/** Sort order for GET /api/tickets. */
export const ticketListSortSchema = z.enum(['newest', 'oldest', 'priority', 'status']);
export type TicketListSort = z.infer<typeof ticketListSortSchema>;

export const ticketsListPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type TicketsListPagination = z.infer<typeof ticketsListPaginationSchema>;

const facetCountRecordSchema = z.record(z.string(), z.number().int().nonnegative());

export const ticketsListFacetsSchema = z.object({
  projects: facetCountRecordSchema,
  sources: z.object({
    jira: z.number().int().nonnegative(),
    helpdesk: z.number().int().nonnegative(),
  }),
  priorities: z.object({
    critical: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
  }),
  statuses: z.object({
    open: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  /** Assigned-to-current-user count within active filters (excluding `mine`). */
  mineCount: z.number().int().nonnegative(),
  /** View tab counts (priority/project/q/status filters applied; source/mine excluded). */
  viewCounts: z.object({
    all: z.number().int().nonnegative(),
    mine: z.number().int().nonnegative(),
    jira: z.number().int().nonnegative(),
    me: z.number().int().nonnegative(),
  }),
  /** Open/closed display bucket counts (computed before `bucket` filter is applied). */
  bucketCounts: z.object({
    all: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
  }),
});

export type TicketsListFacets = z.infer<typeof ticketsListFacetsSchema>;

export const ticketsListResponseSchema = z.object({
  data: z.array(ticketApiDtoSchema),
  pagination: ticketsListPaginationSchema,
  facets: ticketsListFacetsSchema,
});

export type TicketsListResponse = z.infer<typeof ticketsListResponseSchema>;

export const ticketDetailResponseSchema = z.object({
  data: ticketApiDtoSchema,
});

export type TicketDetailResponse = z.infer<typeof ticketDetailResponseSchema>;

const booleanQuerySchema = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => v === true || v === 'true');

/** Display-only open/closed grouping for the ticket queue list (never mutates ticket status). */
export const ticketListBucketSchema = z.enum(['all', 'open', 'closed']);
export type TicketListBucket = z.infer<typeof ticketListBucketSchema>;

export const ticketsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  source: ticketSourceSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  status: ticketStatusSchema.optional(),
  project: z.string().min(1).optional(),
  q: z.string().optional(),
  sort: ticketListSortSchema.optional().default('newest'),
  mine: booleanQuerySchema.optional(),
  bucket: ticketListBucketSchema.optional(),
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
    created: z.string().optional(),
    updated: z.string().optional(),
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
