import { z } from 'zod';

/** Ticket origin system (Phase 2: Jira only). */
export const ticketSourceSchema = z.enum(['jira', 'helpdesk']);

/** Normalized priority for USD. */
export const ticketPrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

/** Normalized lifecycle status. */
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

/**
 * Stored ticket shape in `support_tickets` (DynamoDB item).
 */
export const supportTicketRecordSchema = z.object({
  ticketId: z.string().min(1),
  orgId: z.string().min(1),
  source: ticketSourceSchema,
  externalId: z.string().min(1),
  summary: z.string(),
  description: z.string().optional(),
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
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
  summary: true,
  description: true,
  priority: true,
  status: true,
  assigneeId: true,
  reporterId: true,
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
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
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
