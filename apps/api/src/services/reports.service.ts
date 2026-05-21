import type { ReportPeriodDays } from '@usd/shared-types';
import { getOrgSlaPolicy } from '../db/tables/org-settings.js';
import { listAllTicketsForOrg } from '../db/tables/tickets.js';
import { aggregateResolutionTrend } from '../reports/aggregateResolution.js';
import { aggregateSlaTrend } from '../reports/aggregateSla.js';
import { aggregateTeamPerformance } from '../reports/aggregateTeam.js';
import { aggregateVolumeTrend } from '../reports/aggregateVolume.js';
import { rowsToCsv } from '../reports/toCsv.js';
import { cacheGetJson, cacheSetJson } from './redis-cache.service.js';

const CACHE_TTL_SECONDS = 3600;

function cacheKey(orgId: string, report: string, days: number): string {
  return `report:${orgId}:${report}:${String(days)}`;
}

/**
 * Loads tickets once per org report request (cached aggregations).
 */
async function loadTicketsCached(orgId: string, days: ReportPeriodDays) {
  const key = cacheKey(orgId, 'tickets', days);
  const cached = await cacheGetJson<{ loadedAt: string }>(key);
  if (cached !== undefined) {
    return listAllTicketsForOrg(orgId);
  }
  const tickets = await listAllTicketsForOrg(orgId);
  await cacheSetJson(key, { loadedAt: new Date().toISOString() }, CACHE_TTL_SECONDS);
  return tickets;
}

/**
 * Volume trend report payload or CSV.
 */
export async function getVolumeReport(
  orgId: string,
  days: ReportPeriodDays,
  format: 'json' | 'csv',
): Promise<{ contentType: string; body: unknown }> {
  const cacheK = cacheKey(orgId, 'volume', days);
  const cached = await cacheGetJson<{ periodDays: number; points: unknown[] }>(cacheK);
  if (cached !== undefined && format === 'json') {
    return { contentType: 'application/json', body: { data: cached } };
  }
  const tickets = await loadTicketsCached(orgId, days);
  const points = aggregateVolumeTrend(tickets, days);
  const data = { periodDays: days, points };
  await cacheSetJson(cacheK, data, CACHE_TTL_SECONDS);
  if (format === 'csv') {
    const csv = rowsToCsv(
      ['date', 'jira', 'helpdesk', 'total'],
      points.map((p) => [p.date, p.jira, p.helpdesk, p.total]),
    );
    return { contentType: 'text/csv', body: csv };
  }
  return { contentType: 'application/json', body: { data } };
}

/**
 * Resolution trend report.
 */
export async function getResolutionReport(
  orgId: string,
  days: ReportPeriodDays,
  format: 'json' | 'csv',
): Promise<{ contentType: string; body: unknown }> {
  const cacheK = cacheKey(orgId, 'resolution', days);
  const cached = await cacheGetJson<{ periodDays: number; points: unknown[] }>(cacheK);
  if (cached !== undefined && format === 'json') {
    return { contentType: 'application/json', body: { data: cached } };
  }
  const tickets = await loadTicketsCached(orgId, days);
  const points = aggregateResolutionTrend(tickets, days);
  const data = { periodDays: days, points };
  await cacheSetJson(cacheK, data, CACHE_TTL_SECONDS);
  if (format === 'csv') {
    const csv = rowsToCsv(
      ['week', 'opened', 'resolved'],
      points.map((p) => [p.week, p.opened, p.resolved]),
    );
    return { contentType: 'text/csv', body: csv };
  }
  return { contentType: 'application/json', body: { data } };
}

/**
 * SLA compliance trend report.
 */
export async function getSlaReport(
  orgId: string,
  days: ReportPeriodDays,
  format: 'json' | 'csv',
): Promise<{ contentType: string; body: unknown }> {
  const cacheK = cacheKey(orgId, 'sla', days);
  const cached = await cacheGetJson<{ periodDays: number; points: unknown[] }>(cacheK);
  if (cached !== undefined && format === 'json') {
    return { contentType: 'application/json', body: { data: cached } };
  }
  const tickets = await loadTicketsCached(orgId, days);
  const policy = await getOrgSlaPolicy(orgId);
  const points = aggregateSlaTrend(tickets, policy, days);
  const data = { periodDays: days, points };
  await cacheSetJson(cacheK, data, CACHE_TTL_SECONDS);
  if (format === 'csv') {
    const csv = rowsToCsv(
      ['week', 'met', 'breached'],
      points.map((p) => [p.week, p.met, p.breached]),
    );
    return { contentType: 'text/csv', body: csv };
  }
  return { contentType: 'application/json', body: { data } };
}

/**
 * Team performance report.
 */
export async function getTeamReport(
  orgId: string,
  days: ReportPeriodDays,
  format: 'json' | 'csv',
): Promise<{ contentType: string; body: unknown }> {
  const cacheK = cacheKey(orgId, 'team', days);
  const cached = await cacheGetJson<{ periodDays: number; rows: unknown[] }>(cacheK);
  if (cached !== undefined && format === 'json') {
    return { contentType: 'application/json', body: { data: cached } };
  }
  const tickets = await loadTicketsCached(orgId, days);
  const policy = await getOrgSlaPolicy(orgId);
  const rows = aggregateTeamPerformance(tickets, policy, days);
  const data = { periodDays: days, rows };
  await cacheSetJson(cacheK, data, CACHE_TTL_SECONDS);
  if (format === 'csv') {
    const csv = rowsToCsv(
      ['assignee', 'assigned', 'resolved', 'avgResolutionHours', 'slaMetPercent'],
      rows.map((r) => [
        r.assignee,
        r.assigned,
        r.resolved,
        r.avgResolutionHours,
        r.slaMetPercent,
      ]),
    );
    return { contentType: 'text/csv', body: csv };
  }
  return { contentType: 'application/json', body: { data } };
}
