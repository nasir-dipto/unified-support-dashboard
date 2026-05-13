import { z } from 'zod';

/**
 * Canonical API health payload shape shared by apps.
 */
export const healthStatusSchema = z.object({
  status: z.literal('ok'),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
