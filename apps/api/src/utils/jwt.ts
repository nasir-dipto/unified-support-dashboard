import * as jose from 'jose';
import { supportRoleSchema, type SupportRole } from '@usd/shared-types';
import { ulid } from 'ulid';
import { getServerEnv } from '../config/loadEnv.js';
import { getJwtKeyMaterial } from './secrets.js';

const ACCESS_TYP = 'access';
const REFRESH_TYP = 'refresh';

export type AccessTokenPayload = {
  sub: string;
  orgId: string;
  email: string;
  roles: SupportRole[];
  displayName?: string;
  typ: typeof ACCESS_TYP;
};

export type RefreshTokenPayload = {
  sub: string;
  orgId: string;
  jti: string;
  typ: typeof REFRESH_TYP;
};

/**
 * Issues a short-lived access JWT (RS256).
 */
export async function signAccessToken(payload: {
  userId: string;
  orgId: string;
  email: string;
  roles: SupportRole[];
  displayName?: string;
}): Promise<string> {
  const env = getServerEnv();
  const keys = await getJwtKeyMaterial();
  const privateKey = await jose.importPKCS8(keys.privateKey, 'RS256');
  const exp = Math.floor(Date.now() / 1000) + env.ACCESS_TOKEN_TTL_SECONDS;
  const displayName = payload.displayName?.trim();
  return await new jose.SignJWT({
    orgId: payload.orgId,
    email: payload.email,
    roles: payload.roles,
    typ: ACCESS_TYP,
    ...(displayName !== undefined && displayName.length > 0
      ? { displayName }
      : {}),
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.userId)
    .setExpirationTime(exp)
    .sign(privateKey);
}

/**
 * Issues a refresh JWT (RS256) carrying a new jti to persist on the user record.
 */
export async function signRefreshToken(payload: {
  userId: string;
  orgId: string;
}): Promise<{ token: string; jti: string }> {
  const env = getServerEnv();
  const keys = await getJwtKeyMaterial();
  const privateKey = await jose.importPKCS8(keys.privateKey, 'RS256');
  const jti = ulid();
  const exp = Math.floor(Date.now() / 1000) + env.REFRESH_TOKEN_TTL_SECONDS;
  const token = await new jose.SignJWT({
    orgId: payload.orgId,
    jti,
    typ: REFRESH_TYP,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setSubject(payload.userId)
    .setExpirationTime(exp)
    .sign(privateKey);
  return { token, jti };
}

/**
 * Verifies an access JWT and returns its payload fields.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const keys = await getJwtKeyMaterial();
  const publicKey = await jose.importSPKI(keys.publicKey, 'RS256');
  const { payload } = await jose.jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
  });
  if (payload.typ !== ACCESS_TYP) {
    throw new Error('Invalid token type');
  }
  const userId = typeof payload.sub === 'string' ? payload.sub : '';
  const orgId = typeof payload.orgId === 'string' ? payload.orgId : '';
  const email = typeof payload.email === 'string' ? payload.email : '';
  const rolesRaw = payload.roles;
  if (userId.length === 0 || orgId.length === 0 || email.length === 0) {
    throw new Error('Missing required claims');
  }
  if (!Array.isArray(rolesRaw)) {
    throw new Error('Invalid roles claim');
  }
  const rolesParsed: SupportRole[] = [];
  for (const r of rolesRaw) {
    const one = supportRoleSchema.safeParse(r);
    if (!one.success) {
      throw new Error('Invalid roles claim');
    }
    rolesParsed.push(one.data);
  }
  const roles = rolesParsed;
  const displayNameRaw = payload.displayName;
  const displayName =
    typeof displayNameRaw === 'string' && displayNameRaw.trim().length > 0
      ? displayNameRaw.trim()
      : undefined;
  return { sub: userId, orgId, email, roles, displayName, typ: ACCESS_TYP };
}

/**
 * Verifies a refresh JWT and returns subject, org, and jti.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const keys = await getJwtKeyMaterial();
  const publicKey = await jose.importSPKI(keys.publicKey, 'RS256');
  const { payload } = await jose.jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
  });
  if (payload.typ !== REFRESH_TYP) {
    throw new Error('Invalid token type');
  }
  const userId = typeof payload.sub === 'string' ? payload.sub : '';
  const orgId = typeof payload.orgId === 'string' ? payload.orgId : '';
  const jti = typeof payload.jti === 'string' ? payload.jti : '';
  if (userId.length === 0 || orgId.length === 0 || jti.length === 0) {
    throw new Error('Missing required refresh claims');
  }
  return { sub: userId, orgId, jti, typ: REFRESH_TYP };
}
