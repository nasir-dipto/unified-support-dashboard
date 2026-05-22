import cors from 'cors';
import express from 'express';
import { healthStatusSchema } from '@usd/shared-types';
import { aiRouter } from './routes/ai.routes.js';
import { kbRouter } from './routes/kb.routes.js';
import { sentimentRouter } from './routes/sentiment.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { ticketsRouter } from './routes/tickets.routes.js';
import { webhooksRouter } from './routes/webhooks.routes.js';
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
  app.use('/api/webhooks', webhooksRouter);
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.type('text').send('Hello World');
  });

  app.get('/health', (_req, res) => {
    const payload: { status: 'ok' } = { status: 'ok' };
    healthStatusSchema.parse(payload);
    res.json(payload);
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/sentiment', sentimentRouter);
  app.use('/api/kb', kbRouter);
  app.use('/api/tickets', ticketsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/settings', settingsRouter);

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
      void next;
      const body = toApiErrorBody(err);
      res.status(body.statusCode).json(body);
    },
  );

  return app;
}
