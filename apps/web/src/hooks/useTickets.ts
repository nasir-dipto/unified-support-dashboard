import { useQuery } from '@tanstack/react-query';
import { fetchTicketDetail, fetchTicketsList } from '../api/tickets';
import { useAuthStore } from '../store/auth.store';

/**
 * TanStack Query: paginated ticket list for the signed-in org.
 */
export function useTicketsList(params?: { limit?: number; cursor?: string }) {
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
