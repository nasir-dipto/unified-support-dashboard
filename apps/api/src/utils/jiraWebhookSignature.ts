import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.js';

const SHA256_PREFIX = 'sha256=';

/**
 * Verifies GitHub-style `x-hub-signature-256` (HMAC-SHA256 hex) for a raw webhook body.
 */
export function assertValidHubSignature256(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): void {
  if (signatureHeader === undefined || !signatureHeader.startsWith(SHA256_PREFIX)) {
    throw new AppError('Missing or invalid x-hub-signature-256', 'WEBHOOK_SIGNATURE', 401);
  }
  if (secret.length === 0) {
    throw new AppError('Webhook secret not configured', 'CONFIG', 500);
  }
  const receivedHex = signatureHeader.slice(SHA256_PREFIX.length).trim();
  const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(receivedHex, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('Invalid webhook signature', 'WEBHOOK_SIGNATURE', 401);
  }
}
