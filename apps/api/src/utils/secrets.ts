import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { getServerEnv } from '../config/loadEnv.js';

export type JwtKeyMaterial = {
  privateKey: string;
  publicKey: string;
};

let cached: JwtKeyMaterial | undefined;

/**
 * Returns RS256 PEM key pair. Local dev uses JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
 * from process.env; non-local uses AWS Secrets Manager when ARN is configured.
 */
export async function getJwtKeyMaterial(): Promise<JwtKeyMaterial> {
  if (cached !== undefined) {
    return cached;
  }
  const env = getServerEnv();
  if (
    env.JWT_PRIVATE_KEY !== undefined &&
    env.JWT_PRIVATE_KEY.length > 0 &&
    env.JWT_PUBLIC_KEY !== undefined &&
    env.JWT_PUBLIC_KEY.length > 0
  ) {
    cached = {
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
    };
    return cached;
  }
  if (env.JWT_KEY_SECRET_ARN === undefined || env.JWT_KEY_SECRET_ARN.length === 0) {
    throw new Error('JWT_KEY_SECRET_ARN is required when inline JWT keys are not set');
  }
  const client = new SecretsManagerClient({ region: env.AWS_REGION });
  const out = await client.send(
    new GetSecretValueCommand({ SecretId: env.JWT_KEY_SECRET_ARN }),
  );
  const raw = out.SecretString;
  if (raw === undefined) {
    throw new Error('Secrets Manager returned empty secret string');
  }
  const parsed = JSON.parse(raw) as { privateKey?: string; publicKey?: string };
  if (
    typeof parsed.privateKey !== 'string' ||
    typeof parsed.publicKey !== 'string' ||
    parsed.privateKey.length === 0 ||
    parsed.publicKey.length === 0
  ) {
    throw new Error('JWT secret JSON must include privateKey and publicKey PEM strings');
  }
  cached = { privateKey: parsed.privateKey, publicKey: parsed.publicKey };
  return cached;
}

/**
 * Clears the in-memory JWT key cache (for tests).
 */
export function clearJwtKeyCache(): void {
  cached = undefined;
}
