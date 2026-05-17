import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { upsertTicket } from '../db/tables/tickets.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
import {
  filterJiraProjectsByInclude,
  getJiraIncludeProjectsFromEnv,
} from '../jira/jiraIncludeProjects.js';
import { fetchIssuesByProject, fetchProjects } from '../services/jira.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
 * Manual Jira → Dynamo reconciliation for local development.
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  const includeProjects = getJiraIncludeProjectsFromEnv(env);
  const allProjects = await fetchProjects();
  const projects = filterJiraProjectsByInclude(allProjects, includeProjects);
  if (includeProjects === null) {
    console.info(`Jira reconcile: all ${String(projects.length)} accessible project(s).`);
  } else {
    const keys = projects.map((p) => p.key).join(', ');
    console.info(
      `Jira reconcile: ${String(projects.length)} project(s) included (JIRA_INCLUDE_PROJECTS): ${keys}`,
    );
  }
  for (const p of projects) {
    let nextPageToken: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const page = await fetchIssuesByProject(p.key, {
        maxResults: 25,
        nextPageToken,
      });
      for (const hit of page.issues) {
        const issue = { key: hit.key, fields: hit.fields ?? {} };
        const rec = mapJiraIssueToTicket({
          issue,
          orgId: env.JIRA_DEFAULT_ORG_ID,
        });
        await upsertTicket(rec);
      }
      if (page.nextPageToken === undefined) {
        hasMore = false;
      } else {
        nextPageToken = page.nextPageToken;
      }
    }
  }
  console.info(`Reconciled Jira projects into org ${env.JIRA_DEFAULT_ORG_ID}.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
