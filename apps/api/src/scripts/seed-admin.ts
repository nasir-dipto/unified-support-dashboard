import bcrypt from 'bcryptjs';
import { config as loadEnvFile } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupportRole } from '@usd/shared-types';
import { ensureDevJwtKeys } from '../config/ensureDevJwtKeys.js';
import { getServerEnv, loadServerEnv, resetServerEnvForTests } from '../config/loadEnv.js';
import { resetDocumentClientForTests } from '../db/dynamo.client.js';
import { seedOrgSettingsDefaults } from '../db/tables/org-settings.js';
import { setSupportRole } from '../db/tables/roles.js';
import {
  createUser,
  getUserByEmail,
  updatePasswordHash,
  updateUserDisplayName,
} from '../db/tables/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BCRYPT_ROUNDS = 8;

type SeedUser = {
  email: string;
  password: string;
  role: SupportRole;
  displayName?: string;
};

const SEED_USERS: SeedUser[] = [
  { email: 'admin@usd.dev', password: 'Admin123!', role: 'super_admin' },
  { email: 'manager@usd.dev', password: 'Mgr123!', role: 'manager' },
  {
    email: 'technician@usd.dev',
    password: 'Tech123!',
    role: 'technician',
    displayName: 'Nasir Dipto Personal',
  },
];

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
 * Ensures demo users exist for local development login (idempotent).
 */
async function main(): Promise<void> {
  bootstrapEnv();
  const env = getServerEnv();
  const orgId = env.JIRA_DEFAULT_ORG_ID;
  await seedOrgSettingsDefaults(orgId);

  for (const seed of SEED_USERS) {
    const existing = await getUserByEmail(orgId, seed.email);
    const passwordHash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);
    if (existing !== undefined) {
      await updatePasswordHash(orgId, existing.userId, passwordHash);
      await setSupportRole(orgId, existing.userId, seed.role);
      if (seed.displayName !== undefined) {
        await updateUserDisplayName(orgId, existing.userId, seed.displayName);
      }
      console.log(`Updated ${seed.role} user ${seed.email} (userId=${existing.userId}).`);
      continue;
    }
    const user = await createUser({ orgId, email: seed.email, passwordHash });
    await setSupportRole(orgId, user.userId, seed.role);
    if (seed.displayName !== undefined) {
      await updateUserDisplayName(orgId, user.userId, seed.displayName);
    }
    console.log(`Created ${seed.role} user ${seed.email} (userId=${user.userId}).`);
  }
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
