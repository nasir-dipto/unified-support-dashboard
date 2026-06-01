import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { upsertTicket } from '../db/tables/tickets.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
import {
  filterJiraProjectsByInclude,
  getJiraIncludeProjectsFromEnv,
} from '../jira/jiraIncludeProjects.js';
import { syncIssueComments } from '../jira/syncIssueComments.js';
import { fetchIssuesByProject, fetchProjects } from '../services/jira.service.js';
import { parseSyncCliArgs } from './syncCliArgs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type JiraProjectSyncStats = {
  fetched: number;
  upserted: number;
  skipped: number;
};

/**
 * Loads `.env.local` from repo root and API package, then validates env (same as the API process).
 */
function bootstrapEnv(): void {
  const apiRoot = join(__dirname, '..', '..');
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
  resetServerEnvForTests();
  resetDocumentClientForTests();
  ensureDevJwtKeys();
  loadServerEnv();
}

/**
 * Reconciles one Jira project into Dynamo (all pages).
 */
export async function reconcileJiraProject(params: {
  projectKey: string;
  orgId: string;
  sinceMinutes?: number;
}): Promise<JiraProjectSyncStats> {
  const stats: JiraProjectSyncStats = { fetched: 0, upserted: 0, skipped: 0 };
  let nextPageToken: string | undefined;
  let hasMore = true;
  while (hasMore) {
    const page = await fetchIssuesByProject(params.projectKey, {
      maxResults: 25,
      nextPageToken,
      sinceMinutes: params.sinceMinutes,
    });
    stats.fetched += page.issues.length;
    for (const hit of page.issues) {
      const issue = { key: hit.key, fields: hit.fields ?? {} };
      const rec = mapJiraIssueToTicket({
        issue,
        orgId: params.orgId,
      });
      const saved = await upsertTicket(rec);
      stats.upserted += 1;
      const synced = await syncIssueComments({
        orgId: params.orgId,
        ticketId: saved.ticketId,
        issueKey: issue.key,
      });
      if (synced > 0) {
        console.info(`  ${issue.key}: synced ${String(synced)} comment(s)`);
      }
    }
    if (page.nextPageToken === undefined) {
      hasMore = false;
    } else {
      nextPageToken = page.nextPageToken;
    }
  }
  return stats;
}

/**
 * Logs per-project Jira sync stats in a consistent format.
 */
export function formatJiraProjectSyncLine(projectKey: string, stats: JiraProjectSyncStats): string {
  if (stats.fetched === 0) {
    return `  ${projectKey}: 0 tickets`;
  }
  return `  ${projectKey}: ${String(stats.fetched)} tickets fetched, ${String(stats.upserted)} upserted, ${String(stats.skipped)} skipped`;
}

/**
 * Manual Jira → Dynamo reconciliation for local development.
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const cli = parseSyncCliArgs(process.argv.slice(2));
  const env = getServerEnv();
  const includeProjects = getJiraIncludeProjectsFromEnv(env);
  const allProjects = await fetchProjects();
  const projects = filterJiraProjectsByInclude(allProjects, includeProjects);
  const started = performance.now();

  if (cli.mode === 'incremental') {
    console.info(`Jira incremental sync (last ${String(cli.sinceMinutes)} min):`);
  } else {
    console.info('Jira full sync:');
  }

  if (includeProjects === null) {
    console.info(`  Scope: all ${String(projects.length)} accessible project(s).`);
  } else {
    const keys = projects.map((p) => p.key).join(', ');
    console.info(
      `  Scope: ${String(projects.length)} project(s) (JIRA_INCLUDE_PROJECTS): ${keys}`,
    );
  }

  let totalFetched = 0;
  for (const p of projects) {
    const stats = await reconcileJiraProject({
      projectKey: p.key,
      orgId: env.JIRA_DEFAULT_ORG_ID,
      sinceMinutes: cli.sinceMinutes,
    });
    totalFetched += stats.fetched;
    console.info(formatJiraProjectSyncLine(p.key, stats));
  }

  const elapsedSec = ((performance.now() - started) / 1000).toFixed(1);
  console.info(`Total: ${String(totalFetched)} tickets in ${elapsedSec}s`);
  console.info(`Reconciled Jira projects into org ${env.JIRA_DEFAULT_ORG_ID}.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
