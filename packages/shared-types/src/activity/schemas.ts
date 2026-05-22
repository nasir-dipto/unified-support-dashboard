import { z } from 'zod';
import { wsOutboundEnvelopeSchema } from '../websocket/schemas.js';

/** Query params for GET /api/activity/recent */
export const activityRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export type ActivityRecentQuery = z.infer<typeof activityRecentQuerySchema>;

/** Response for GET /api/activity/recent */
export const activityRecentResponseSchema = z.object({
  data: z.array(wsOutboundEnvelopeSchema),
  total: z.number().int().nonnegative(),
});

export type ActivityRecentResponse = z.infer<typeof activityRecentResponseSchema>;
