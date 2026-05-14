import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureAllUsdLocalDynamoTables } from '../db/ensureUsdLocalDynamoTables.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads `.env.local` from repo root and API package (same search order as other scripts).
 */
function loadLocalEnvFiles(): void {
  const apiRoot = join(__dirname, '..', '..');
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  loadEnvFile({ path: join(repoRoot, '.env.local') });
  loadEnvFile({ path: join(apiRoot, '.env.local'), override: true });
}

/**
 * CLI entry: creates USD DynamoDB tables on DynamoDB Local when missing.
 */
async function main(): Promise<void> {
  loadLocalEnvFiles();
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const endpoint =
    process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
  const client = new DynamoDBClient({ region, endpoint });
  await ensureAllUsdLocalDynamoTables(client);
  console.log(
    `DynamoDB Local tables ensured at ${endpoint} (region ${region}).`,
  );
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
