import { notificationsListResponseSchema } from '@usd/shared-types';
import { apiClient } from './client';

/**
 * Lists in-app notifications for the signed-in org.
 */
export async function fetchNotifications() {
  const res = await apiClient.get('/api/notifications');
  return notificationsListResponseSchema.parse(res.data);
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const res = await apiClient.post(`/api/notifications/${notificationId}/read`);
  return res.data as { data: unknown };
}
