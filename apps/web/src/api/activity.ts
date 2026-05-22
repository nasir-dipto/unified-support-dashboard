import { activityRecentResponseSchema } from '@usd/shared-types';
import { apiClient } from './client.js';

/**
 * Fetches recent WebSocket activity events for the signed-in org.
 */
export async function fetchRecentActivity(limit = 50) {
  const res = await apiClient.get('/api/activity/recent', { params: { limit } });
  return activityRecentResponseSchema.parse(res.data).data;
}
