import cors from 'cors';
import express from 'express';
import { healthStatusSchema } from '@usd/shared-types';
import { authRouter } from './routes/auth.routes.js';
import { postJiraWebhook } from './routes/tickets.handlers.js';
import { ticketsRouter } from './routes/tickets.routes.js';
import { toApiErrorBody } from './utils/errors.js';

/**
 * Creates the Express application (shared by runtime and tests).
 */
export function createApp(): express.Application {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.post(
    '/api/webhooks/jira',
    express.raw({ type: 'application/json', limit: '5mb' }),
    postJiraWebhook,
  );
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.type('text').send('Hello World');
  });

  app.get('/health', (_req, res) => {
    const payload: { status: 'ok' } = { status: 'ok' };
    healthStatusSchema.parse(payload);
    res.json(payload);
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tickets', ticketsRouter);

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      void next;
      const body = toApiErrorBody(err);
      res.status(body.statusCode).json(body);
    },
  );

  return app;
}
