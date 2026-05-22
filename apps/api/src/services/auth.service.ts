import bcrypt from 'bcryptjs';
import type {
  AuthUserPublic,
  LoginResponse,
  RefreshResponse,
  SupportRole,
} from '@usd/shared-types';
import { getServerEnv } from '../config/loadEnv.js';
import * as roles from '../db/tables/roles.js';
import * as users from '../db/tables/users.js';
import { AppError } from '../utils/errors.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

/**
 * Authenticates a user by org + email + password and issues token pair.
 */
export async function loginWithPassword(
  orgId: string,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const user = await users.getUserByEmail(orgId, email);
  if (user === undefined) {
    throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
  }
  const roleRec = await roles.getSupportRole(orgId, user.userId);
  if (user.passwordHash.length === 0) {
    throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
  }
  const roleList: SupportRole[] =
    roleRec !== undefined ? [roleRec.role] : ['technician'];
  const accessToken = await signAccessToken({
    userId: user.userId,
    orgId,
    email: user.email,
    roles: roleList,
  });
  const { token: refreshToken, jti } = await signRefreshToken({
    userId: user.userId,
    orgId,
  });
  const env = getServerEnv();
  const exp = Math.floor(Date.now() / 1000) + env.REFRESH_TOKEN_TTL_SECONDS;
  await users.setUserRefreshMetadata(orgId, user.userId, jti, exp);
  const userPublic: AuthUserPublic = {
    userId: user.userId,
    orgId,
    email: user.email,
    roles: roleList,
  };
  return { accessToken, refreshToken, user: userPublic };
}

/**
 * Rotates refresh token and issues a new access token.
 */
export async function refreshSession(refreshToken: string): Promise<RefreshResponse> {
  let payload: Awaited<ReturnType<typeof verifyRefreshToken>>;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token', 'UNAUTHORIZED', 401);
  }
  const user = await users.getUserById(payload.orgId, payload.sub);
  if (user === undefined) {
    throw new AppError('Invalid refresh token', 'UNAUTHORIZED', 401);
  }
  if (user.refreshJti !== payload.jti) {
    throw new AppError('Refresh token revoked', 'UNAUTHORIZED', 401);
  }
  const now = Math.floor(Date.now() / 1000);
  if (user.refreshExp !== undefined && user.refreshExp < now) {
    throw new AppError('Refresh token expired', 'UNAUTHORIZED', 401);
  }
  const roleRec = await roles.getSupportRole(payload.orgId, user.userId);
  if (user.passwordHash.length === 0) {
    throw new AppError('Invalid credentials', 'UNAUTHORIZED', 401);
  }
  const roleList: SupportRole[] =
    roleRec !== undefined ? [roleRec.role] : ['technician'];
  const accessToken = await signAccessToken({
    userId: user.userId,
    orgId: payload.orgId,
    email: user.email,
    roles: roleList,
  });
  const { token: newRefresh, jti } = await signRefreshToken({
    userId: user.userId,
    orgId: payload.orgId,
  });
  const env = getServerEnv();
  const exp = now + env.REFRESH_TOKEN_TTL_SECONDS;
  await users.setUserRefreshMetadata(payload.orgId, user.userId, jti, exp);
  return { accessToken, refreshToken: newRefresh };
}

/**
 * Clears persisted refresh metadata using a valid access token.
 */
export async function logoutFromAccessToken(accessToken: string): Promise<void> {
  let payload: Awaited<ReturnType<typeof verifyAccessToken>>;
  try {
    payload = await verifyAccessToken(accessToken);
  } catch {
    throw new AppError('Invalid access token', 'UNAUTHORIZED', 401);
  }
  await users.clearUserRefreshMetadata(payload.orgId, payload.sub);
}
