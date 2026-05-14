import { serverEnvRefinedSchema, type ServerEnvRefined } from '@usd/shared-types';
import { AppError } from '../utils/errors.js';

type ParsedEnv = ServerEnvRefined;

let cachedEnv: ParsedEnv | undefined;

/**
 * Reads and validates process.env once for the API process.
 */
export function loadServerEnv(): ParsedEnv {
  if (cachedEnv !== undefined) {
    return cachedEnv;
  }
  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    AWS_REGION: process.env.AWS_REGION,
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT,
    SUPPORT_USERS_TABLE: process.env.SUPPORT_USERS_TABLE,
    SUPPORT_ROLES_TABLE: process.env.SUPPORT_ROLES_TABLE,
    SUPPORT_TICKETS_TABLE: process.env.SUPPORT_TICKETS_TABLE,
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
    JWT_KEY_SECRET_ARN: process.env.JWT_KEY_SECRET_ARN,
    ACCESS_TOKEN_TTL_SECONDS: process.env.ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS: process.env.REFRESH_TOKEN_TTL_SECONDS,
    JIRA_URL: process.env.JIRA_URL,
    JIRA_EMAIL: process.env.JIRA_EMAIL,
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN,
    JIRA_WEBHOOK_SECRET: process.env.JIRA_WEBHOOK_SECRET,
    JIRA_DEFAULT_ORG_ID: process.env.JIRA_DEFAULT_ORG_ID,
  };
  const parsed = serverEnvRefinedSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new AppError(
      `Invalid server environment: ${JSON.stringify(msg)}`,
      'CONFIG',
      500,
    );
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Returns validated server env (must call loadServerEnv during startup).
 */
export function getServerEnv(): ParsedEnv {
  if (cachedEnv === undefined) {
    throw new AppError('Server environment not loaded', 'CONFIG', 500);
  }
  return cachedEnv;
}

/**
 * Resets cached env (Vitest only).
 */
export function resetServerEnvForTests(): void {
  cachedEnv = undefined;
}
