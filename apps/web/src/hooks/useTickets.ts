import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TicketsListQuery } from '@usd/shared-types';
import {
  fetchTicketComments,
  fetchTicketDetail,
  fetchTicketsList,
  postTicketComment,
  type PostTicketCommentParams,
  type TicketsListParams,
} from '../api/tickets';
import { useAuthStore } from '../store/auth.store';

export type { TicketsListParams };

/** Default page size for the technician ticket queue. */
export const DEFAULT_TICKETS_PAGE_SIZE = 10;

/** Larger limit for manager dashboard overview (first page only). */
export const MANAGER_TICKETS_LIST_LIMIT = 100;

/**
 * TanStack Query: ticket list for the signed-in org (filters + pagination + facets).
 */
export function useTicketsList(params?: TicketsListParams) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const listParams: TicketsListParams = params ?? {};
  return useQuery({
    queryKey: ['tickets', orgId, listParams],
    queryFn: async () => fetchTicketsList(listParams as TicketsListQuery),
    enabled: orgId !== undefined && orgId.length > 0,
    placeholderData: (prev) => prev,
  });
}

/**
 * TanStack Query: linked ticket detail when `linkedTicketId` is set.
 */
export function useLinkedTicketDetail(linkedTicketId: string | undefined, enabled: boolean) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['ticket', orgId, linkedTicketId],
    queryFn: async () => fetchTicketDetail(linkedTicketId ?? ''),
    enabled:
      enabled &&
      orgId !== undefined &&
      orgId.length > 0 &&
      linkedTicketId !== undefined &&
      linkedTicketId.length > 0,
  });
}

/**
 * TanStack Query: single ticket detail.
 */
export function useTicketDetail(ticketId: string | undefined) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['ticket', orgId, ticketId],
    queryFn: async () => fetchTicketDetail(ticketId ?? ''),
    enabled:
      orgId !== undefined &&
      orgId.length > 0 &&
      ticketId !== undefined &&
      ticketId.length > 0,
  });
}

/**
 * TanStack Query: ticket comments (USD store + mirrored upstream notes).
 */
export function useTicketComments(ticketId: string | undefined) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['ticket-comments', orgId, ticketId],
    queryFn: async () => fetchTicketComments(ticketId ?? ''),
    enabled:
      orgId !== undefined &&
      orgId.length > 0 &&
      ticketId !== undefined &&
      ticketId.length > 0,
  });
}

/**
 * Mutation: post comment via API (invalidates detail + comments queries).
 */
export function usePostTicketComment(ticketId: string | undefined) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: PostTicketCommentParams) =>
      postTicketComment(ticketId ?? '', params),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ticket-comments', orgId, ticketId] });
      await qc.invalidateQueries({ queryKey: ['ticket', orgId, ticketId] });
      await qc.invalidateQueries({ queryKey: ['tickets', orgId] });
    },
  });
}
