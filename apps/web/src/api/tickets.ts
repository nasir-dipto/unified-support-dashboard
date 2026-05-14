import {
  ticketDetailResponseSchema,
  ticketsListResponseSchema,
} from '@usd/shared-types';
import { apiClient } from './client';

export type TicketsListParams = {
  limit?: number;
  cursor?: string;
};

/**
 * Fetches the authenticated org's ticket list from the API.
 */
export async function fetchTicketsList(params?: TicketsListParams) {
  const res = await apiClient.get('/api/tickets', { params });
  return ticketsListResponseSchema.parse(res.data);
}

/**
 * Fetches a single ticket by id for the authenticated org.
 */
export async function fetchTicketDetail(ticketId: string) {
  const res = await apiClient.get(`/api/tickets/${encodeURIComponent(ticketId)}`);
  return ticketDetailResponseSchema.parse(res.data);
}
