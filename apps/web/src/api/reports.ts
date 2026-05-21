import {
  reportQuerySchema,
  resolutionReportResponseSchema,
  slaReportResponseSchema,
  teamReportResponseSchema,
  volumeReportResponseSchema,
  type ReportPeriodDays,
  type ReportQuery,
} from '@usd/shared-types';
import { apiClient } from './client';

export type ReportFormat = ReportQuery['format'];

/**
 * Fetches volume trend report JSON.
 */
export async function fetchVolumeReport(days: ReportPeriodDays = 7) {
  const res = await apiClient.get('/api/reports/volume', {
    params: reportQuerySchema.parse({ days, format: 'json' }),
  });
  return volumeReportResponseSchema.parse(res.data);
}

/**
 * Fetches resolution trend report JSON.
 */
export async function fetchResolutionReport(days: ReportPeriodDays = 7) {
  const res = await apiClient.get('/api/reports/resolution', {
    params: reportQuerySchema.parse({ days, format: 'json' }),
  });
  return resolutionReportResponseSchema.parse(res.data);
}

/**
 * Fetches SLA compliance report JSON.
 */
export async function fetchSlaReport(days: ReportPeriodDays = 7) {
  const res = await apiClient.get('/api/reports/sla', {
    params: reportQuerySchema.parse({ days, format: 'json' }),
  });
  return slaReportResponseSchema.parse(res.data);
}

/**
 * Fetches team performance report JSON.
 */
export async function fetchTeamReport(days: ReportPeriodDays = 7) {
  const res = await apiClient.get('/api/reports/team', {
    params: reportQuerySchema.parse({ days, format: 'json' }),
  });
  return teamReportResponseSchema.parse(res.data);
}
