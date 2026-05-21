import { useQuery } from '@tanstack/react-query';
import type { ReportPeriodDays } from '@usd/shared-types';
import {
  fetchResolutionReport,
  fetchSlaReport,
  fetchTeamReport,
  fetchVolumeReport,
} from '../api/reports';
import { useAuthStore } from '../store/auth.store';

/**
 * TanStack Query: volume report for admin/manager reporting tab.
 */
export function useVolumeReport(days: ReportPeriodDays = 7) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['reports', 'volume', orgId, days],
    queryFn: () => fetchVolumeReport(days),
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * TanStack Query: resolution trend report.
 */
export function useResolutionReport(days: ReportPeriodDays = 7) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['reports', 'resolution', orgId, days],
    queryFn: () => fetchResolutionReport(days),
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * TanStack Query: SLA compliance report.
 */
export function useSlaReport(days: ReportPeriodDays = 7) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['reports', 'sla', orgId, days],
    queryFn: () => fetchSlaReport(days),
    enabled: orgId !== undefined && orgId.length > 0,
  });
}

/**
 * TanStack Query: team performance report.
 */
export function useTeamReport(days: ReportPeriodDays = 7) {
  const orgId = useAuthStore((s) => s.user?.orgId);
  return useQuery({
    queryKey: ['reports', 'team', orgId, days],
    queryFn: () => fetchTeamReport(days),
    enabled: orgId !== undefined && orgId.length > 0,
  });
}
