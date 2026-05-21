import { z } from 'zod';

/** Report lookback window in days. */
export const reportPeriodDaysSchema = z.union([z.literal(7), z.literal(30)]);

export type ReportPeriodDays = z.infer<typeof reportPeriodDaysSchema>;

export const reportQuerySchema = z.object({
  days: z.coerce
    .number()
    .pipe(reportPeriodDaysSchema)
    .optional()
    .default(7),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const volumeTrendPointSchema = z.object({
  date: z.string().min(1),
  jira: z.number().int().nonnegative(),
  helpdesk: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export type VolumeTrendPoint = z.infer<typeof volumeTrendPointSchema>;

export const volumeReportResponseSchema = z.object({
  data: z.object({
    periodDays: reportPeriodDaysSchema,
    points: z.array(volumeTrendPointSchema),
  }),
});

export type VolumeReportResponse = z.infer<typeof volumeReportResponseSchema>;

export const resolutionTrendPointSchema = z.object({
  week: z.string().min(1),
  opened: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

export type ResolutionTrendPoint = z.infer<typeof resolutionTrendPointSchema>;

export const resolutionReportResponseSchema = z.object({
  data: z.object({
    periodDays: reportPeriodDaysSchema,
    points: z.array(resolutionTrendPointSchema),
  }),
});

export type ResolutionReportResponse = z.infer<typeof resolutionReportResponseSchema>;

export const slaTrendPointSchema = z.object({
  week: z.string().min(1),
  met: z.number().int().nonnegative(),
  breached: z.number().int().nonnegative(),
});

export type SlaTrendPoint = z.infer<typeof slaTrendPointSchema>;

export const slaReportResponseSchema = z.object({
  data: z.object({
    periodDays: reportPeriodDaysSchema,
    points: z.array(slaTrendPointSchema),
  }),
});

export type SlaReportResponse = z.infer<typeof slaReportResponseSchema>;

export const teamPerformanceRowSchema = z.object({
  assignee: z.string().min(1),
  assigned: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  avgResolutionHours: z.number().nonnegative().nullable(),
  slaMetPercent: z.number().min(0).max(100).nullable(),
});

export type TeamPerformanceRow = z.infer<typeof teamPerformanceRowSchema>;

export const teamReportResponseSchema = z.object({
  data: z.object({
    periodDays: reportPeriodDaysSchema,
    rows: z.array(teamPerformanceRowSchema),
  }),
});

export type TeamReportResponse = z.infer<typeof teamReportResponseSchema>;
