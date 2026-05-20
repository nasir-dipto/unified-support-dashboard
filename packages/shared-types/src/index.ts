import { z } from 'zod';

/**
 * Canonical API health payload shape shared by apps.
 */
export const healthStatusSchema = z.object({
  status: z.literal('ok'),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export * from './ai/schemas.js';
export * from './sentiment/schemas.js';
export * from './health/schemas.js';
export * from './auth/schemas.js';
export * from './env/server-env.js';
export * from './helpdesk/schemas.js';
export * from './tickets/schemas.js';
export * from './websocket/schemas.js';
