import { z } from 'zod';

/** KB article lifecycle status. */
export const kbArticleStatusSchema = z.enum(['draft', 'published']);

export type KbArticleStatus = z.infer<typeof kbArticleStatusSchema>;

/** Stored and API KB article shape. */
export const kbArticleSchema = z.object({
  kbId: z.string().min(1),
  orgId: z.string().min(1),
  title: z.string().min(1),
  problem: z.string().min(1),
  rootCause: z.string().min(1),
  resolutionSteps: z.string().min(1),
  tags: z.array(z.string()),
  sourceTicketIds: z.array(z.string()),
  status: kbArticleStatusSchema,
  createdBy: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  publishedAt: z.string().min(1).nullable().optional(),
});

export type KbArticle = z.infer<typeof kbArticleSchema>;

export const kbArticlesListResponseSchema = z.object({
  data: z.array(kbArticleSchema),
  total: z.number().int().nonnegative(),
});

export type KbArticlesListResponse = z.infer<typeof kbArticlesListResponseSchema>;

export const kbArticleDetailResponseSchema = z.object({
  data: kbArticleSchema,
});

export type KbArticleDetailResponse = z.infer<typeof kbArticleDetailResponseSchema>;

export const createKbArticleBodySchema = z.object({
  title: z.string().min(1),
  problem: z.string().min(1),
  rootCause: z.string().min(1),
  resolutionSteps: z.string().min(1),
  tags: z.array(z.string()).default([]),
  sourceTicketIds: z.array(z.string()).default([]),
});

export type CreateKbArticleBody = z.infer<typeof createKbArticleBodySchema>;

export const updateKbArticleBodySchema = createKbArticleBodySchema.partial();

export type UpdateKbArticleBody = z.infer<typeof updateKbArticleBodySchema>;

export const kbSearchRequestSchema = z.object({
  ticketId: z.string().min(1),
});

export type KbSearchRequest = z.infer<typeof kbSearchRequestSchema>;

export const kbSearchResultSchema = z.object({
  kbId: z.string().min(1),
  title: z.string(),
  problem: z.string(),
  similarity: z.number().min(0).max(1),
  sourceTicketIds: z.array(z.string()),
});

export type KbSearchResult = z.infer<typeof kbSearchResultSchema>;

export const kbSearchResponseSchema = z.object({
  data: z.array(kbSearchResultSchema),
  total: z.number().int().nonnegative(),
});

export type KbSearchResponse = z.infer<typeof kbSearchResponseSchema>;

/** AI-generated KB draft (POST /api/ai/invoke kb_draft). */
export const kbDraftResponseSchema = z.object({
  title: z.string(),
  problem: z.string(),
  rootCause: z.string(),
  resolutionSteps: z.string(),
  tags: z.array(z.string()),
  sourceTicketIds: z.array(z.string()),
  degraded: z.boolean().optional(),
});

export type KbDraftResponse = z.infer<typeof kbDraftResponseSchema>;
