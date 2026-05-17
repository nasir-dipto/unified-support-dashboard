import {
  aiInvokeRequestSchema,
  commentDraftResponseSchema,
  triageSuggestResponseSchema,
  type AiFeature,
  type CommentDraftResponse,
  type TriageSuggestResponse,
} from '@usd/shared-types';
import { apiClient } from './client';

export type InvokeAiParams = {
  feature: AiFeature;
  ticketId: string;
  context?: Record<string, unknown>;
};

/**
 * Calls POST /api/ai/invoke for triage or comment draft features.
 */
export async function invokeAi(
  params: InvokeAiParams,
): Promise<TriageSuggestResponse | CommentDraftResponse> {
  const body = aiInvokeRequestSchema.parse(params);
  const res = await apiClient.post('/api/ai/invoke', body);
  if (params.feature === 'triage_suggest') {
    return triageSuggestResponseSchema.parse(res.data);
  }
  return commentDraftResponseSchema.parse(res.data);
}
