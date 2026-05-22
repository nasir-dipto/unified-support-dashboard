import {
  createKbArticleBodySchema,
  kbArticleDetailResponseSchema,
  kbArticlesListResponseSchema,
  kbDraftResponseSchema,
  kbSearchRequestSchema,
  kbSearchResponseSchema,
  updateKbArticleBodySchema,
  type CreateKbArticleBody,
  type KbArticle,
  type KbDraftResponse,
  type KbSearchResult,
  type UpdateKbArticleBody,
} from '@usd/shared-types';
import { apiClient } from './client';

/**
 * Lists KB articles for the current org.
 */
export async function listKbArticles(
  status?: 'draft' | 'published',
  sourceTicketId?: string,
): Promise<KbArticle[]> {
  const params: { status?: string; sourceTicketId?: string } = {};
  if (status !== undefined) {
    params.status = status;
  }
  if (sourceTicketId !== undefined && sourceTicketId.length > 0) {
    params.sourceTicketId = sourceTicketId;
  }
  const res = await apiClient.get('/api/kb', {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return kbArticlesListResponseSchema.parse(res.data).data;
}

/**
 * Returns true when a draft KB article already exists for the given ticket id.
 */
export async function checkKbDraftExists(ticketId: string): Promise<boolean> {
  const articles = await listKbArticles('draft', ticketId);
  return articles.length > 0;
}

/**
 * Creates a draft KB article.
 */
export async function createKbArticle(body: CreateKbArticleBody): Promise<KbArticle> {
  const payload = createKbArticleBodySchema.parse(body);
  const res = await apiClient.post('/api/kb', payload);
  return kbArticleDetailResponseSchema.parse(res.data).data;
}

/**
 * Updates a KB article draft.
 */
export async function updateKbArticle(kbId: string, body: UpdateKbArticleBody): Promise<KbArticle> {
  const payload = updateKbArticleBodySchema.parse(body);
  const res = await apiClient.put(`/api/kb/${kbId}`, payload);
  return kbArticleDetailResponseSchema.parse(res.data).data;
}

/**
 * Publishes a KB article (computes embedding).
 */
export async function publishKbArticle(kbId: string): Promise<KbArticle> {
  const res = await apiClient.post(`/api/kb/${kbId}/publish`);
  return kbArticleDetailResponseSchema.parse(res.data).data;
}

/**
 * Deletes a KB article.
 */
export async function deleteKbArticle(kbId: string): Promise<void> {
  await apiClient.delete(`/api/kb/${kbId}`);
}

/**
 * Semantic search for articles related to a ticket.
 */
export async function searchKb(ticketId: string): Promise<KbSearchResult[]> {
  const body = kbSearchRequestSchema.parse({ ticketId });
  const res = await apiClient.post('/api/kb/search', body);
  return kbSearchResponseSchema.parse(res.data).data;
}

/**
 * Generates a KB draft via POST /api/ai/invoke (not persisted).
 */
export async function generateKbDraft(ticketId: string): Promise<KbDraftResponse> {
  const res = await apiClient.post('/api/ai/invoke', { feature: 'kb_draft', ticketId });
  return kbDraftResponseSchema.parse(res.data);
}

/**
 * Lists published KB articles for browse (all roles).
 */
export async function listPublishedKbArticles(q?: string): Promise<KbArticle[]> {
  const res = await apiClient.get('/api/kb/published', {
    params: q !== undefined && q.length > 0 ? { q } : undefined,
  });
  return kbArticlesListResponseSchema.parse(res.data).data;
}

/**
 * Fetches one published KB article for the reader view.
 */
export async function getPublishedKbArticle(kbId: string): Promise<KbArticle> {
  const res = await apiClient.get(`/api/kb/published/${kbId}`);
  return kbArticleDetailResponseSchema.parse(res.data).data;
}
