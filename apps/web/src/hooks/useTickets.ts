import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTicketComments,
  fetchTicketDetail,
  fetchTicketsList,
  postTicketComment,
  type PostTicketCommentParams,
} from '../api/tickets';
import { useAuthStore } from '../store/auth.store';

export type TicketsListParams = {
  limit?: number;
  cursor?: string;
};

/** Default list page size — show full queue without pagination for now. */
export const DEFAULT_TICKETS_LIST_LIMIT = 100;

/**
 * TanStack Query: paginated ticket list for the signed-in org.
 */
export function useTicketsList(params?: TicketsListParams) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  const listParams: TicketsListParams = {
    limit: params?.limit ?? DEFAULT_TICKETS_LIST_LIMIT,
    cursor: params?.cursor,
  };
  return useQuery({
    queryKey: ['tickets', orgId, listParams.limit, listParams.cursor],
    queryFn: async () => fetchTicketsList(listParams),
    enabled: orgId !== undefined && orgId.length > 0,
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
