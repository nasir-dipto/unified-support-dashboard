import { useQuery } from '@tanstack/react-query';
import { fetchHealthDetail } from '../api/health';

/**
 * TanStack Query for GET /api/health/detail (admin health tab).
 */
export function useHealthDetail(enabled = true) {
  return useQuery({
    queryKey: ['health', 'detail'],
    queryFn: fetchHealthDetail,
    enabled,
    refetchInterval: 30_000,
  });
}
