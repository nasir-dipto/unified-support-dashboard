import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { supportTicketRecordSchema } from '@usd/shared-types';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { getDocumentClient, resetDocumentClientForTests } from '../db/dynamo.client.js';
import { analyzeHdTicketSentiment } from '../services/sentiment.service.js';
import { updateTicketSentiment } from '../db/tables/tickets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Re-runs sentiment for one ticket (bypasses 1hr cooldown). Usage: reanalyze-ticket <ticketId>
 */
async function main(): Promise<void> {
  const ticketId = process.argv[2];
  if (ticketId === undefined || ticketId.length === 0) {
    console.error('Usage: reanalyze-ticket <ticketId>');
    process.exitCode = 1;
    return;
  }
  const apiRoot = join(__dirname, '..', '..');
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
  resetServerEnvForTests();
  resetDocumentClientForTests();
  ensureDevJwtKeys();
  loadServerEnv();
  const orgId = getServerEnv().HD_DEFAULT_ORG_ID;
  const env = getServerEnv();
  const doc = getDocumentClient();
  const out = await doc.send(
    new GetCommand({ TableName: env.SUPPORT_TICKETS_TABLE, Key: { ticketId } }),
  );
  if (out.Item === undefined) {
    console.error(`Ticket not found: ${ticketId}`);
    process.exitCode = 1;
    return;
  }
  const rec = supportTicketRecordSchema.parse(out.Item);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await doc.send(
    new PutCommand({
      TableName: env.SUPPORT_TICKETS_TABLE,
      Item: { ...rec, sentimentAt: twoHoursAgo, sentimentStale: true },
    }),
  );
  const analysis = await analyzeHdTicketSentiment(orgId, rec);
  if (analysis === null) {
    console.error('Sentiment analysis skipped');
    process.exitCode = 1;
    return;
  }
  await updateTicketSentiment(orgId, ticketId, analysis);
  console.info(`${ticketId}: sentiment=${analysis.sentiment} churn=${String(analysis.churnRisk)}`);
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
