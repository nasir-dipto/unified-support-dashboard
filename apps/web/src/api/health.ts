import { healthDetailResponseSchema } from '@usd/shared-types';
import { apiClient } from './client';

/**
 * Fetches detailed health status from GET /api/health/detail.
 */
export async function fetchHealthDetail() {
  const res = await apiClient.get('/api/health/detail');
  return healthDetailResponseSchema.parse(res.data);
}
