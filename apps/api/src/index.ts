import express from 'express';
import { healthStatusSchema } from '@usd/shared-types';

/**
 * Phase 0 HTTP entrypoint: health check and plain-text smoke route only.
 */
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.get('/', (_req, res) => {
  res.type('text').send('Hello World');
});

app.get('/health', (_req, res) => {
  const payload: { status: 'ok' } = { status: 'ok' };
  healthStatusSchema.parse(payload);
  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${String(PORT)}`);
});
