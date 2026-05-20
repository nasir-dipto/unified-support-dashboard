import { useQuery } from '@tanstack/react-query';
import { getSentimentSummary, type SentimentSummaryParams } from '../api/sentiment';
import { useAuthStore } from '../store/auth.store';

/**
 * TanStack query for GET /api/sentiment/summary.
 */
export function useSentimentSummary(params?: SentimentSummaryParams) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['sentiment', 'summary', orgId, params?.sentiment],
    queryFn: async () => getSentimentSummary(params),
    enabled: orgId !== undefined,
  });
}
