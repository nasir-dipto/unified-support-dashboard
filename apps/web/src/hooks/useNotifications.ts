import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from '../api/notifications';
import { useAuthStore } from '../store/auth.store';

export const NOTIFICATIONS_QUERY_KEY = 'notifications';

/**
 * TanStack Query: in-app notifications list and unread count.
 */
export function useNotificationsList() {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, orgId],
    queryFn: fetchNotifications,
    enabled: orgId !== undefined && orgId.length > 0,
    refetchInterval: 60_000,
  });
}

/**
 * Mutation: mark one notification read and refresh list.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, orgId] });
    },
  });
}
