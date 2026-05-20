import {
  sentimentSummaryResponseSchema,
  ticketSentimentSchema,
  type SentimentSummaryResponse,
  type TicketSentiment,
} from '@usd/shared-types';
import { apiClient } from './client';

export type SentimentSummaryParams = {
  sentiment?: TicketSentiment;
};

/**
 * Fetches Helpdesk sentiment aggregates for manager charts.
 */
export async function getSentimentSummary(
  params?: SentimentSummaryParams,
): Promise<SentimentSummaryResponse> {
  const query =
    params?.sentiment !== undefined
      ? { sentiment: params.sentiment }
      : undefined;
  const res = await apiClient.get('/api/sentiment/summary', { params: query });
  return sentimentSummaryResponseSchema.parse(res.data);
}

export { ticketSentimentSchema };
