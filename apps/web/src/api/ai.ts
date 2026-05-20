import {
  aiInvokeRequestSchema,
  commentDraftResponseSchema,
  morningBriefingResponseSchema,
  triageSuggestResponseSchema,
  type AiInvokeRequest,
  type CommentDraftResponse,
  type MorningBriefingResponse,
  type TriageSuggestResponse,
} from '@usd/shared-types';
import { apiClient } from './client';

export type InvokeAiParams = AiInvokeRequest;

export type InvokeAiResult =
  | TriageSuggestResponse
  | CommentDraftResponse
  | MorningBriefingResponse;

/**
 * Calls POST /api/ai/invoke for triage, comment draft, or morning briefing.
 */
export async function invokeAi(params: InvokeAiParams): Promise<InvokeAiResult> {
  const body = aiInvokeRequestSchema.parse(params);
  const res = await apiClient.post('/api/ai/invoke', body);
  if (params.feature === 'triage_suggest') {
    return triageSuggestResponseSchema.parse(res.data);
  }
  if (params.feature === 'morning_briefing') {
    return morningBriefingResponseSchema.parse(res.data);
  }
  return commentDraftResponseSchema.parse(res.data);
}
