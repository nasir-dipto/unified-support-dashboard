import {
  postTicketCommentResponseSchema,
  ticketCommentsListResponseSchema,
  ticketCrossLinkResponseSchema,
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

/**
 * Lists USD comments stored for the ticket (newest first).
 */
export async function fetchTicketComments(ticketId: string) {
  const res = await apiClient.get(`/api/tickets/${encodeURIComponent(ticketId)}/comments`);
  return ticketCommentsListResponseSchema.parse(res.data);
}

/**
 * Posts a USD comment mirrored to Jira or Helpdesk.
 */
export async function postTicketComment(ticketId: string, body: string) {
  const res = await apiClient.post(`/api/tickets/${encodeURIComponent(ticketId)}/comments`, {
    body,
  });
  return postTicketCommentResponseSchema.parse(res.data);
}

/**
 * Bidirectionally links a Jira ticket with a Helpdesk ticket in the same org.
 */
export async function postTicketCrossLink(ticketId: string, linkedTicketId: string) {
  const res = await apiClient.post(`/api/tickets/${encodeURIComponent(ticketId)}/link`, {
    linkedTicketId,
  });
  return ticketCrossLinkResponseSchema.parse(res.data);
}
