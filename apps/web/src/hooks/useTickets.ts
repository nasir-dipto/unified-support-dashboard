import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTicketComments,
  fetchTicketDetail,
  fetchTicketsList,
  postTicketComment,
} from '../api/tickets';
import { useAuthStore } from '../store/auth.store';

export type TicketsListParams = {
  limit?: number;
  cursor?: string;
};

/**
 * TanStack Query: paginated ticket list for the signed-in org.
 */
export function useTicketsList(params?: TicketsListParams) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['tickets', orgId, params?.limit, params?.cursor],
    queryFn: async () => fetchTicketsList(params),
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
    mutationFn: async (body: string) => postTicketComment(ticketId ?? '', body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ticket-comments', orgId, ticketId] });
      await qc.invalidateQueries({ queryKey: ['ticket', orgId, ticketId] });
      await qc.invalidateQueries({ queryKey: ['tickets', orgId] });
    },
  });
}
