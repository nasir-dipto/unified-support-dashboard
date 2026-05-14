import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { upsertTicket } from '../db/tables/tickets.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { mapJiraIssueToTicket } from '../jira/mapIssueToTicket.js';
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
  const projects = await fetchProjects();
  for (const p of projects) {
    let startAt = 0;
    let hasMore = true;
    while (hasMore) {
      const page = await fetchIssuesByProject(p.key, { startAt, maxResults: 25 });
      for (const hit of page.issues) {
        const issue = { key: hit.key, fields: hit.fields ?? {} };
        const rec = mapJiraIssueToTicket({
          issue,
          orgId: env.JIRA_DEFAULT_ORG_ID,
        });
        await upsertTicket(rec);
      }
      if (page.nextStartAt === undefined) {
        hasMore = false;
      } else {
        startAt = page.nextStartAt;
      }
    }
  }
  console.info(`Reconciled Jira projects into org ${env.JIRA_DEFAULT_ORG_ID}.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
