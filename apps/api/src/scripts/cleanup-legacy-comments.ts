import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { getDocumentClient, resetDocumentClientForTests } from '../db/dynamo.client.js';
import {
  collectLegacyCommentDeletions,
  parseLegacyCommentRow,
  type LegacyCommentRow,
} from './cleanup-legacy-comments.logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads `.env.local` from repo root and API package (same pattern as reconcile scripts).
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
 * Scans all rows in `support_ticket_comments`.
 */
async function scanAllComments(tableName: string): Promise<LegacyCommentRow[]> {
  const doc = getDocumentClient();
  const rows: LegacyCommentRow[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const out = await doc.send(
      new ScanCommand({
        TableName: tableName,
        ...(exclusiveStartKey !== undefined ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );
    for (const raw of out.Items ?? []) {
      if (typeof raw !== 'object') {
        continue;
      }
      const parsed = parseLegacyCommentRow(raw as Record<string, unknown>);
      if (parsed !== null) {
        rows.push(parsed);
      }
    }
    const lek = out.LastEvaluatedKey;
    exclusiveStartKey =
      lek !== undefined && typeof lek === 'object' && !Array.isArray(lek)
        ? (lek as Record<string, unknown>)
        : undefined;
  } while (exclusiveStartKey !== undefined);
  return rows;
}

/**
 * One-time local cleanup for legacy `support_ticket_comments` rows (DynamoDB Local only).
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  if (env.DYNAMODB_ENDPOINT === undefined || env.DYNAMODB_ENDPOINT.trim().length === 0) {
    console.error(
      'Refusing to run without DYNAMODB_ENDPOINT (e.g. http://localhost:8000). Never run against production.',
    );
    process.exitCode = 1;
    return;
  }

  const tableName = env.SUPPORT_TICKET_COMMENTS_TABLE;
  console.info(`Scanning "${tableName}" at ${env.DYNAMODB_ENDPOINT}…`);

  const before = await scanAllComments(tableName);
  console.info(`Before: ${String(before.length)} comment row(s).`);

  const deletions = collectLegacyCommentDeletions(before);
  if (deletions.length === 0) {
    console.info('Nothing to delete.');
    console.info(`After: ${String(before.length)} comment row(s).`);
    return;
  }

  const doc = getDocumentClient();
  const byReason = new Map<string, number>();
  for (const target of deletions) {
    await doc.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { orgId: target.orgId, ticketCommentKey: target.ticketCommentKey },
      }),
    );
    byReason.set(target.reason, (byReason.get(target.reason) ?? 0) + 1);
    console.info(`  deleted ${target.ticketCommentKey} (${target.reason})`);
  }

  const after = await scanAllComments(tableName);
  console.info(`Deleted ${String(deletions.length)} row(s):`);
  for (const [reason, count] of byReason) {
    console.info(`  ${reason}: ${String(count)}`);
  }
  console.info(`After: ${String(after.length)} comment row(s).`);
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
