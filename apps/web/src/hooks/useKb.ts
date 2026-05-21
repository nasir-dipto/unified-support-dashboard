import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateKbArticleBody, UpdateKbArticleBody } from '@usd/shared-types';
import {
  checkKbDraftExists,
  createKbArticle,
  deleteKbArticle,
  generateKbDraft,
  listKbArticles,
  publishKbArticle,
  searchKb,
  updateKbArticle,
} from '../api/kb';
import { useAuthStore } from '../store/auth.store';

/**
 * Lists KB articles (drafts and published).
 */
export function useKbArticles(status?: 'draft' | 'published') {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['kb', orgId, status],
    queryFn: async () => listKbArticles(status),
    enabled: orgId !== undefined,
  });
}

/**
 * Checks whether a draft KB article already exists for a ticket (runs when modal opens).
 */
export function useKbDraftExists(ticketId: string | undefined, enabled: boolean) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['kb-draft-exists', orgId, ticketId],
    queryFn: async () => {
      if (ticketId === undefined) {
        return false;
      }
      return checkKbDraftExists(ticketId);
    },
    enabled: enabled && ticketId !== undefined && orgId !== undefined,
  });
}

/**
 * Semantic KB search for a ticket.
 */
export function useKbSearch(ticketId: string | undefined) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationKey: ['kb-search', orgId, ticketId],
    mutationFn: async () => {
      if (ticketId === undefined) {
        throw new Error('ticketId required');
      }
      return searchKb(ticketId);
    },
  });
}

/**
 * AI KB draft generation (not persisted).
 */
export function useKbDraft() {
  return useMutation({
    mutationFn: async (ticketId: string) => generateKbDraft(ticketId),
  });
}

/**
 * Creates a KB draft article.
 */
export function useCreateKbArticle() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: async (body: CreateKbArticleBody) => createKbArticle(body),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: ['kb', orgId] });
      for (const ticketId of variables.sourceTicketIds) {
        await qc.invalidateQueries({ queryKey: ['kb-draft-exists', orgId, ticketId] });
      }
    },
  });
}

/**
 * Updates a KB article.
 */
export function useUpdateKbArticle() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: async ({ kbId, body }: { kbId: string; body: UpdateKbArticleBody }) =>
      updateKbArticle(kbId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['kb', orgId] });
    },
  });
}

/**
 * Publishes a KB article.
 */
export function usePublishKbArticle() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: async (kbId: string) => publishKbArticle(kbId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['kb', orgId] });
    },
  });
}

/**
 * Deletes a KB article.
 */
export function useDeleteKbArticle() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: async (kbId: string) => deleteKbArticle(kbId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['kb', orgId] });
    },
  });
}
