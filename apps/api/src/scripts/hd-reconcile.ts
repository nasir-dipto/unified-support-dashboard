import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { upsertTicket } from '../db/tables/tickets.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { mapHdRequestToTicket } from '../helpdesk/mapRequestToTicket.js';
import { syncRequestConversations } from '../helpdesk/syncRequestConversations.js';
import { fetchRequestsPage } from '../services/helpdesk.service.js';

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
 * Manual Helpdesk → Dynamo reconciliation for local development.
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  let startIndex = 1;
  let hasMore = true;
  while (hasMore) {
    const page = await fetchRequestsPage({ rowCount: 25, startIndex });
    for (const row of page.requests) {
      const rec = mapHdRequestToTicket({
        request: row,
        orgId: env.HD_DEFAULT_ORG_ID,
      });
      const saved = await upsertTicket(rec);
      const internalId =
        typeof row.id === 'string'
          ? row.id
          : typeof row.id === 'number'
            ? String(row.id)
            : saved.internalId;
      if (internalId !== undefined && internalId.length > 0) {
        const synced = await syncRequestConversations({
          orgId: env.HD_DEFAULT_ORG_ID,
          ticketId: saved.ticketId,
          internalId,
        });
        if (synced > 0) {
          console.info(`  ${saved.ticketId}: synced ${String(synced)} conversation(s)`);
        }
      }
    }
    if (page.requests.length === 0) {
      hasMore = false;
    } else if (!page.hasMore) {
      hasMore = false;
    } else {
      startIndex += page.requests.length;
    }
  }
  console.info(`Reconciled Helpdesk requests into org ${env.HD_DEFAULT_ORG_ID}.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
