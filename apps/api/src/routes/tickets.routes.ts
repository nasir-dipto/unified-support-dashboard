import { Router } from 'express';
import {
  getTicket,
  getTicketComments,
  getTickets,
  postTicketComment,
  postTicketLink,
} from './tickets.handlers.js';

export const ticketsRouter = Router();

ticketsRouter.get('/', ...getTickets);
ticketsRouter.get('/:ticketId/comments', ...getTicketComments);
ticketsRouter.post('/:ticketId/comments', ...postTicketComment);
ticketsRouter.post('/:ticketId/link', ...postTicketLink);
ticketsRouter.get('/:ticketId', ...getTicket);
