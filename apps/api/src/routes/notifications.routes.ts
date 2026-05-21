import { Router } from 'express';
import {
  listNotificationsHandler,
  markNotificationReadHandler,
} from './notifications.handlers.js';

export const notificationsRouter = Router();

notificationsRouter.get('/', listNotificationsHandler);
notificationsRouter.post('/:notificationId/read', markNotificationReadHandler);
