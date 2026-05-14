import { generateKeyPairSync } from 'node:crypto';

/**
 * Returns true when the value is absent or only whitespace.
 */
function isUnset(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

/**
 * When running the API locally without JWT material, generates an ephemeral RSA
 * pair into `process.env` so `loadServerEnv()` and JWT signing can succeed.
 * Skips in `test` (harness supplies keys), `production`, and when keys or ARN are already set.
 */
export function ensureDevJwtKeys(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv === 'test' || nodeEnv === 'production') {
    return;
  }
  const hasInlineKeys =
    !isUnset(process.env.JWT_PRIVATE_KEY) && !isUnset(process.env.JWT_PUBLIC_KEY);
  const hasArn = !isUnset(process.env.JWT_KEY_SECRET_ARN);
  if (hasInlineKeys || hasArn) {
    return;
  }
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
  console.warn(
    '[api] JWT_PRIVATE_KEY/JWT_PUBLIC_KEY were unset; using ephemeral RSA keys for this process (set them in .env.local for stable tokens across restarts).',
  );
}
