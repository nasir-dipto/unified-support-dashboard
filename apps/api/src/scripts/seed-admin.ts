import bcrypt from 'bcryptjs';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { setSupportRole } from '../db/tables/roles.js';
import { createUser, getUserByEmail } from '../db/tables/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEED_EMAIL = 'admin@usd.dev';
const SEED_PASSWORD = 'Admin123!';
/** Bcrypt cost factor (aligned with integration test fixtures). */
const BCRYPT_ROUNDS = 8;

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
 * Ensures a local admin user exists for development login (idempotent).
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  const orgId = env.JIRA_DEFAULT_ORG_ID;
  const existing = await getUserByEmail(orgId, SEED_EMAIL);
  if (existing !== undefined) {
    console.log(
      `Admin user already exists (orgId=${orgId}, email=${SEED_EMAIL}, userId=${existing.userId}).`,
    );
    return;
  }
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  const user = await createUser({ orgId, email: SEED_EMAIL, passwordHash });
  await setSupportRole(orgId, user.userId, 'admin');
  console.log(
    `Created admin user (orgId=${orgId}, email=${SEED_EMAIL}, userId=${user.userId}).`,
  );
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
