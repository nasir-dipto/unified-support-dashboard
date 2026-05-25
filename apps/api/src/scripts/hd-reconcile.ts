import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { markSentimentStale, upsertTicket } from '../db/tables/tickets.js';
import { runIncrementalBatch } from '../sentiment/batchProcessor.js';
import { scanSlaBreachesForOrg } from '../services/notifications.service.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { mapHdRequestToTicket } from '../helpdesk/mapRequestToTicket.js';
import { syncRequestConversations } from '../helpdesk/syncRequestConversations.js';
import type { HelpdeskRequestListItem } from '../services/helpdesk.service.js';
import { fetchRequestsPage } from '../services/helpdesk.service.js';
import { runWithConcurrencyLimit } from '../utils/concurrency.js';

/** Max parallel Helpdesk ticket reconciles per page. */
export const HD_RECONCILE_CONCURRENCY = 5;

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
 * Reconciles one page of Helpdesk requests with bounded concurrency.
 */
export async function reconcileHelpdeskRequestRows(
  rows: readonly HelpdeskRequestListItem[],
  orgId: string,
): Promise<void> {
  await runWithConcurrencyLimit(rows, HD_RECONCILE_CONCURRENCY, async (row) => {
    const rec = mapHdRequestToTicket({
      request: row,
      orgId,
    });
    const saved = await upsertTicket(rec);
    await markSentimentStale(orgId, saved.ticketId);
    const internalId =
      typeof row.id === 'string'
        ? row.id
        : typeof row.id === 'number'
          ? String(row.id)
          : saved.internalId;
    if (internalId !== undefined && internalId.length > 0) {
      const synced = await syncRequestConversations({
        orgId,
        ticketId: saved.ticketId,
        internalId,
      });
      if (synced > 0) {
        console.info(`  ${saved.ticketId}: synced ${String(synced)} conversation(s)`);
      }
    }
  });
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
    await reconcileHelpdeskRequestRows(page.requests, env.HD_DEFAULT_ORG_ID);
    if (page.requests.length === 0) {
      hasMore = false;
    } else if (!page.hasMore) {
      hasMore = false;
    } else {
      startIndex += page.requests.length;
    }
  }
  console.info(`Reconciled Helpdesk requests into org ${env.HD_DEFAULT_ORG_ID}.`);
  const batch = await runIncrementalBatch(env.HD_DEFAULT_ORG_ID);
  console.info(
    `Sentiment batch: examined=${String(batch.examined)} analyzed=${String(batch.analyzed)} skipped=${String(batch.skipped)} errors=${String(batch.errors)}`,
  );
  const slaAlerts = await scanSlaBreachesForOrg(env.HD_DEFAULT_ORG_ID);
  console.info(`SLA breach scan: ${String(slaAlerts)} ticket(s) notified.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
