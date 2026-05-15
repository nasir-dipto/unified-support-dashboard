import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { getDocumentClient, resetDocumentClientForTests } from '../db/dynamo.client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Legacy USD ids used SDP internal numeric ids (`hd_4445000000…`); new ids use `display_id` (`hd_1`, …). */
const LEGACY_HD_TICKET_ID_PREFIX = 'hd_4';

/**
 * Reads a string `ticketId` from a DynamoDB DocumentClient scan item.
 */
function readTicketIdFromScanItem(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const ticketId = (raw as { ticketId?: unknown }).ticketId;
  return typeof ticketId === 'string' && ticketId.length > 0 ? ticketId : undefined;
}

/**
 * Loads `.env.local` from repo root and API package, then validates env (same pattern as `hd-reconcile.ts`).
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
 * Collects `ticketId` values for Helpdesk rows left over from the pre-display-id mapping (`hd_4…`).
 */
async function scanLegacyHelpdeskTicketIds(tableName: string): Promise<string[]> {
  const doc = getDocumentClient();
  const ids: string[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await doc.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: '#src = :src AND begins_with(#tid, :pfx)',
        ExpressionAttributeNames: {
          '#src': 'source',
          '#tid': 'ticketId',
        },
        ExpressionAttributeValues: {
          ':src': 'helpdesk',
          ':pfx': LEGACY_HD_TICKET_ID_PREFIX,
        },
        ProjectionExpression: '#tid',
        ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of (out.Items ?? []) as unknown[]) {
      const ticketId = readTicketIdFromScanItem(raw);
      if (ticketId !== undefined) {
        ids.push(ticketId);
      }
    }
    const lek = out.LastEvaluatedKey;
    exclusiveStartKey =
      lek !== undefined && typeof lek === 'object' && !Array.isArray(lek)
        ? (lek as Record<string, unknown>)
        : undefined;
  } while (exclusiveStartKey !== undefined);
  return ids;
}

/**
 * Deletes each ticket by partition key (sequential deletes avoid DynamoDB Local BatchWrite quirks).
 */
async function deleteTicketsByTicketId(tableName: string, ticketIds: string[]): Promise<void> {
  const doc = getDocumentClient();
  for (const ticketId of ticketIds) {
    await doc.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { ticketId },
      }),
    );
  }
}

/**
 * One-off removal of duplicate Helpdesk tickets keyed by internal SDP id (`hd_4…`), after migrating to display ids.
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  if (env.DYNAMODB_ENDPOINT === undefined || env.DYNAMODB_ENDPOINT.trim().length === 0) {
    console.error(
      'Refusing to run without DYNAMODB_ENDPOINT (e.g. http://localhost:8000 for DynamoDB Local).',
    );
    process.exitCode = 1;
    return;
  }

  const tableName = env.SUPPORT_TICKETS_TABLE;
  console.info(
    `Scanning "${tableName}" for source=helpdesk AND ticketId begins_with "${LEGACY_HD_TICKET_ID_PREFIX}"…`,
  );
  const ticketIds = await scanLegacyHelpdeskTicketIds(tableName);
  console.info(`Found ${String(ticketIds.length)} legacy row(s).`);
  if (ticketIds.length === 0) {
    console.info('Nothing to delete.');
    return;
  }

  await deleteTicketsByTicketId(tableName, ticketIds);
  console.info(`Deleted ${String(ticketIds.length)} legacy Helpdesk ticket(s).`);
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
