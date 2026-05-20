import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { runFullBatch } from '../sentiment/batchProcessor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads env for standalone sentiment batch CLI.
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
 * Runs full Helpdesk sentiment batch (nightly-style). Use `--full` explicitly in package script.
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  const full = process.argv.includes('--full');
  if (!full) {
    console.error('Usage: sentiment-batch --full');
    process.exitCode = 1;
    return;
  }
  const result = await runFullBatch(env.HD_DEFAULT_ORG_ID);
  console.info(
    `Full sentiment batch for ${env.HD_DEFAULT_ORG_ID}: examined=${String(result.examined)} analyzed=${String(result.analyzed)} skipped=${String(result.skipped)} errors=${String(result.errors)}`,
  );
}

void main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
