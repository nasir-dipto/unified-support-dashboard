import { Router } from 'express';
import { getTicket, getTickets } from './tickets.handlers.js';

export const ticketsRouter = Router();

ticketsRouter.get('/', ...getTickets);
ticketsRouter.get('/:ticketId', ...getTicket);
