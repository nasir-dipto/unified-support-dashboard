import { zohoTokenResponseSchema } from '@usd/shared-types';
import { getServerEnv } from '../config/loadEnv.js';
import { AppError } from '../utils/errors.js';

const REFRESH_SKEW_MS = 60_000;

let cachedAccessToken: string | undefined;
let cachedExpiresAtMs = 0;

/**
 * Clears cached Zoho access token (Vitest only).
 */
export function resetZohoAuthCacheForTests(): void {
  cachedAccessToken = undefined;
  cachedExpiresAtMs = 0;
}

/**
 * Returns the Zoho OAuth accounts token URL for the configured domain.
 */
function tokenEndpointUrl(): string {
  const env = getServerEnv();
  const domain = env.ZOHO_DOMAIN.replace(/^\.+/, '');
  return `https://accounts.${domain}/oauth/v2/token`;
}

/**
 * Fetches a new access token using the refresh token grant.
 */
async function fetchAccessTokenWithRefresh(): Promise<{ accessToken: string; expiresInSec: number }> {
  const env = getServerEnv();
  const clientId = env.HD_CLIENT_ID;
  const clientSecret = env.HD_CLIENT_SECRET;
  const refreshToken = env.HD_REFRESH_TOKEN;
  if (
    clientId === undefined ||
    clientId.length === 0 ||
    clientSecret === undefined ||
    clientSecret.length === 0 ||
    refreshToken === undefined ||
    refreshToken.length === 0
  ) {
    throw new AppError(
      'HD_CLIENT_ID, HD_CLIENT_SECRET, and HD_REFRESH_TOKEN are required for Helpdesk OAuth',
      'CONFIG',
      500,
    );
  }
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(tokenEndpointUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new AppError(
      `Zoho token error ${String(res.status)}: ${text.slice(0, 400)}`,
      'ZOHO_AUTH',
      res.status >= 400 && res.status < 600 ? res.status : 502,
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new AppError('Zoho token response was not valid JSON', 'ZOHO_AUTH', 502);
  }
  const parsed = zohoTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new AppError('Zoho token response missing access_token', 'ZOHO_AUTH', 502);
  }
  const expiresInSec = parsed.data.expires_in ?? 3600;
  return { accessToken: parsed.data.access_token, expiresInSec };
}

/**
 * Returns a valid Zoho OAuth access token, refreshing in memory when near expiry.
 */
export async function getZohoAccessToken(): Promise<string> {
  const now = Date.now();
  if (
    cachedAccessToken !== undefined &&
    cachedAccessToken.length > 0 &&
    now < cachedExpiresAtMs - REFRESH_SKEW_MS
  ) {
    return cachedAccessToken;
  }
  const { accessToken, expiresInSec } = await fetchAccessTokenWithRefresh();
  cachedAccessToken = accessToken;
  cachedExpiresAtMs = now + expiresInSec * 1000;
  return accessToken;
}
