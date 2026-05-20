import { z } from 'zod';

/** Supported AI feature identifiers for POST /api/ai/invoke */
export const aiFeatureSchema = z.enum([
  'triage_suggest',
  'comment_draft',
  'morning_briefing',
]);

export type AiFeature = z.infer<typeof aiFeatureSchema>;

/** Tone for `comment_draft` responses and requests. */
export const commentDraftToneSchema = z.enum(['professional', 'empathetic', 'technical']);

export type CommentDraftTone = z.infer<typeof commentDraftToneSchema>;

const aiResponseBaseSchema = {
  /** True when Bedrock timed out or failed — UI still receives HTTP 200. */
  degraded: z.boolean().optional(),
};

export const triageSuggestRequestSchema = z.object({
  feature: z.literal('triage_suggest'),
  ticketId: z.string().min(1),
});

export type TriageSuggestRequest = z.infer<typeof triageSuggestRequestSchema>;

export const commentDraftRequestSchema = z.object({
  feature: z.literal('comment_draft'),
  ticketId: z.string().min(1),
  tone: commentDraftToneSchema.default('professional'),
});

export type CommentDraftRequest = z.infer<typeof commentDraftRequestSchema>;

export const morningBriefingRequestSchema = z.object({
  feature: z.literal('morning_briefing'),
});

export type MorningBriefingRequest = z.infer<typeof morningBriefingRequestSchema>;

/** POST /api/ai/invoke body — server builds context from DB; no client `context`. */
export const aiInvokeRequestSchema = z.discriminatedUnion('feature', [
  triageSuggestRequestSchema,
  commentDraftRequestSchema,
  morningBriefingRequestSchema,
]);

export type AiInvokeRequest = z.infer<typeof aiInvokeRequestSchema>;

export const triageSuggestResponseSchema = z.object({
  engineerAction: z.string(),
  riskLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
  riskReason: z.string().optional(),
  suggestedAssignee: z.string().min(1).optional(),
  ...aiResponseBaseSchema,
});

export type TriageSuggestResponse = z.infer<typeof triageSuggestResponseSchema>;

export const commentDraftResponseSchema = z.object({
  draft: z.string(),
  tone: commentDraftToneSchema,
  ...aiResponseBaseSchema,
});

export type CommentDraftResponse = z.infer<typeof commentDraftResponseSchema>;

export const morningBriefingResponseSchema = z.object({
  briefing: z.string(),
  ...aiResponseBaseSchema,
});

export type MorningBriefingResponse = z.infer<typeof morningBriefingResponseSchema>;

export const aiInvokeResponseSchema = z.union([
  triageSuggestResponseSchema,
  commentDraftResponseSchema,
  morningBriefingResponseSchema,
]);

export type AiInvokeResponse = z.infer<typeof aiInvokeResponseSchema>;
