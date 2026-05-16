import { z } from 'zod';

/** Dependency probe result for detailed health checks. */
export const healthDependencyStatusSchema = z.enum(['connected', 'error']);

export type HealthDependencyStatus = z.infer<typeof healthDependencyStatusSchema>;

/** GET /api/health/detail response. */
export const healthDetailResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string().min(1),
  dynamodb: healthDependencyStatusSchema,
  redis: healthDependencyStatusSchema,
  websocket: z.object({
    connections: z.number().int().nonnegative(),
  }),
  uptime: z.number().nonnegative(),
});

export type HealthDetailResponse = z.infer<typeof healthDetailResponseSchema>;
