import { z } from 'zod';
import {
  ticketApiDtoSchema,
  ticketPrioritySchema,
  ticketSentimentSchema,
} from '../tickets/schemas.js';

export { ticketSentimentSchema };
export type { TicketSentiment } from '../tickets/schemas.js';

export const sentimentTrendPointSchema = z.object({
  weekStart: z.string().min(1),
  positive: z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  avgScore: z.number().min(-1).max(1),
});

export type SentimentTrendPoint = z.infer<typeof sentimentTrendPointSchema>;

export const sentimentCountSchema = z.object({
  positive: z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  unanalyzed: z.number().int().nonnegative(),
});

export type SentimentCount = z.infer<typeof sentimentCountSchema>;

export const customerSentimentRowSchema = z.object({
  customerEmail: z.string().min(1),
  customerLabel: z.string().min(1),
  sentiment: ticketSentimentSchema,
  avgScore: z.number().min(-1).max(1),
  ticketCount: z.number().int().nonnegative(),
  churnRiskCount: z.number().int().nonnegative(),
});

export type CustomerSentimentRow = z.infer<typeof customerSentimentRowSchema>;

export const prioritySentimentBreakdownSchema = z.object({
  priority: ticketPrioritySchema,
  positive: z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
});

export type PrioritySentimentBreakdown = z.infer<typeof prioritySentimentBreakdownSchema>;

export const sentimentTicketRowSchema = ticketApiDtoSchema.pick({
  ticketId: true,
  externalId: true,
  summary: true,
  priority: true,
  status: true,
  customerEmail: true,
  sentiment: true,
  sentimentScore: true,
  churnRisk: true,
  sentimentAt: true,
  createdAt: true,
  updatedAt: true,
});

export type SentimentTicketRow = z.infer<typeof sentimentTicketRowSchema>;

/** GET /api/sentiment/summary — aggregates for manager Sentiment tab charts. */
export const sentimentSummaryResponseSchema = z.object({
  counts: sentimentCountSchema,
  trend: z.array(sentimentTrendPointSchema),
  byCustomer: z.array(customerSentimentRowSchema),
  byPriority: z.array(prioritySentimentBreakdownSchema),
  tickets: z.array(sentimentTicketRowSchema),
  total: z.number().int().nonnegative(),
});

export type SentimentSummaryResponse = z.infer<typeof sentimentSummaryResponseSchema>;

/** Result shape from Bedrock/mock sentiment analysis per ticket. */
export const sentimentAnalysisResultSchema = z.object({
  sentiment: ticketSentimentSchema,
  sentimentScore: z.number().min(-1).max(1),
  churnRisk: z.boolean(),
});

export type SentimentAnalysisResult = z.infer<typeof sentimentAnalysisResultSchema>;
