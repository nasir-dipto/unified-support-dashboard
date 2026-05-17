import { z } from 'zod';

/** Supported AI feature identifiers for POST /api/ai/invoke */
export const aiFeatureSchema = z.enum(['triage_suggest', 'comment_draft']);

export type AiFeature = z.infer<typeof aiFeatureSchema>;

export const aiInvokeRequestSchema = z.object({
  feature: aiFeatureSchema,
  ticketId: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

export type AiInvokeRequest = z.infer<typeof aiInvokeRequestSchema>;

export const triageSuggestResponseSchema = z.object({
  engineerAction: z.string(),
  riskLevel: z.enum(['LOW', 'MED', 'HIGH']).optional(),
  riskReason: z.string().optional(),
});

export type TriageSuggestResponse = z.infer<typeof triageSuggestResponseSchema>;

export const commentDraftResponseSchema = z.object({
  draft: z.string(),
});

export type CommentDraftResponse = z.infer<typeof commentDraftResponseSchema>;

export const aiInvokeResponseSchema = z.union([
  triageSuggestResponseSchema,
  commentDraftResponseSchema,
]);

export type AiInvokeResponse = z.infer<typeof aiInvokeResponseSchema>;
