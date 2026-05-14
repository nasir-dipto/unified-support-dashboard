import express, { Router } from 'express';
import { postHelpdeskWebhook, postJiraWebhook } from './webhooks.handlers.js';

export const webhooksRouter = Router();

webhooksRouter.post(
  '/jira',
  express.raw({ type: 'application/json', limit: '5mb' }),
  postJiraWebhook,
);
webhooksRouter.post('/helpdesk', express.json({ limit: '5mb' }), postHelpdeskWebhook);
