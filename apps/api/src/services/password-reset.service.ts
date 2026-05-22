import bcrypt from 'bcryptjs';
import type { SupportRole } from '@usd/shared-types';
import { getServerEnv } from '../config/loadEnv.js';
import {
  createAuthToken,
  getAuthToken,
  markAuthTokenUsed,
} from '../db/tables/auth-tokens.js';
import { getOrgSmtpSettings } from '../db/tables/org-settings.js';
import { setSupportRole } from '../db/tables/roles.js';
import {
  createUserPendingInvite,
  getUserByEmail,
  getUserById,
  updatePasswordHash,
} from '../db/tables/users.js';
import { AppError } from '../utils/errors.js';
import { buildInviteEmail, buildPasswordResetEmail } from './email-templates.js';
import { sendAuthEmail } from './email.service.js';

const BCRYPT_ROUNDS = 8;

/**
 * Resolves the public web app base URL for email links.
 */
function getWebAppUrl(): string {
  const env = getServerEnv();
  return env.WEB_APP_URL ?? 'http://localhost:5173';
}

/**
 * Validates a token is usable (exists, not expired, not used).
 */
async function assertTokenValid(
  orgId: string,
  tokenId: string,
  expectedType: 'invite' | 'password_reset',
): Promise<Awaited<ReturnType<typeof getAuthToken>> & { tokenId: string }> {
  const token = await getAuthToken(orgId, tokenId);
  if (token === undefined) {
    throw new AppError('Invalid or expired token', 'INVALID_TOKEN', 400);
  }
  if (token.tokenType !== expectedType) {
    throw new AppError('Invalid or expired token', 'INVALID_TOKEN', 400);
  }
  if (token.usedAt !== undefined) {
    throw new AppError('Token already used', 'INVALID_TOKEN', 400);
  }
  if (new Date(token.expiresAt).getTime() < Date.now()) {
    throw new AppError('Token expired', 'INVALID_TOKEN', 400);
  }
  return { ...token, tokenId };
}

/**
 * Sends forgot-password email when user exists (always returns ok to avoid enumeration).
 */
export async function requestPasswordReset(orgId: string, email: string): Promise<void> {
  const user = await getUserByEmail(orgId, email);
  if (user === undefined || user.passwordHash.length === 0) {
    return;
  }
  const smtp = await getOrgSmtpSettings(orgId);
  if (smtp === undefined) {
    throw new AppError('SMTP is not configured', 'SMTP_NOT_CONFIGURED', 503);
  }
  const { tokenId } = await createAuthToken({
    orgId,
    tokenType: 'password_reset',
    email: user.email,
    userId: user.userId,
  });
  const resetUrl = `${getWebAppUrl()}/reset-password?token=${encodeURIComponent(tokenId)}&orgId=${encodeURIComponent(orgId)}`;
  const mail = buildPasswordResetEmail({ resetUrl });
  await sendAuthEmail({
    settings: smtp,
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

/**
 * Resets password using a one-time token.
 */
export async function resetPasswordWithToken(
  orgId: string,
  tokenId: string,
  password: string,
): Promise<void> {
  const token = await assertTokenValid(orgId, tokenId, 'password_reset');
  const userId = token.userId;
  if (userId === undefined) {
    throw new AppError('Invalid token', 'INVALID_TOKEN', 400);
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await updatePasswordHash(orgId, userId, hash);
  await markAuthTokenUsed(orgId, tokenId);
}

/**
 * Accepts an invite and sets the user's password.
 */
export async function acceptInviteWithToken(
  orgId: string,
  tokenId: string,
  password: string,
): Promise<void> {
  const token = await assertTokenValid(orgId, tokenId, 'invite');
  const userId = token.userId;
  if (userId === undefined) {
    throw new AppError('Invalid invite token', 'INVALID_TOKEN', 400);
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await updatePasswordHash(orgId, userId, hash);
  if (token.invitedRole !== undefined) {
    await setSupportRole(orgId, userId, token.invitedRole);
  }
  await markAuthTokenUsed(orgId, tokenId);
}

/**
 * Creates invite token and sends invitation email.
 */
export async function sendUserInvite(params: {
  orgId: string;
  email: string;
  role: SupportRole;
  createdByUserId: string;
}): Promise<void> {
  const existing = await getUserByEmail(params.orgId, params.email);
  let userId = existing?.userId;
  if (existing !== undefined && existing.passwordHash.length > 0) {
    throw new AppError('User already exists', 'USER_EXISTS', 409);
  }
  if (userId === undefined) {
    const created = await createUserPendingInvite({
      orgId: params.orgId,
      email: params.email,
    });
    userId = created.userId;
  }
  await setSupportRole(params.orgId, userId, params.role);
  const smtp = await getOrgSmtpSettings(params.orgId);
  if (smtp === undefined) {
    throw new AppError('SMTP is not configured', 'SMTP_NOT_CONFIGURED', 503);
  }
  const { tokenId } = await createAuthToken({
    orgId: params.orgId,
    tokenType: 'invite',
    email: params.email.toLowerCase(),
    invitedRole: params.role,
    createdByUserId: params.createdByUserId,
    userId,
  });
  const setupUrl = `${getWebAppUrl()}/accept-invite?token=${encodeURIComponent(tokenId)}&orgId=${encodeURIComponent(params.orgId)}`;
  const mail = buildInviteEmail({ setupUrl, invitedRole: params.role });
  await sendAuthEmail({
    settings: smtp,
    to: params.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

/**
 * Ensures user can log in (has password set).
 */
export async function assertUserCanLogin(
  orgId: string,
  userId: string,
): Promise<void> {
  const user = await getUserById(orgId, userId);
  if (user === undefined || user.passwordHash.length === 0) {
    throw new AppError('Account setup incomplete', 'UNAUTHORIZED', 401);
  }
}
