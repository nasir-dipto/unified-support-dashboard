import { z } from 'zod';

/**
 * Environment variables consumed by the API at startup (validated once).
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  AWS_REGION: z.string().min(1).default('us-east-1'),
  /** When set, DynamoDB client talks to DynamoDB Local instead of AWS. */
  DYNAMODB_ENDPOINT: z.string().url().optional(),
  SUPPORT_USERS_TABLE: z.string().min(1).default('support_users'),
  SUPPORT_ROLES_TABLE: z.string().min(1).default('support_roles'),
  /** PEM-encoded RS256 private key (local dev via .env.local). */
  JWT_PRIVATE_KEY: z.string().min(1).optional(),
  /** PEM-encoded RS256 public key (local dev via .env.local). */
  JWT_PUBLIC_KEY: z.string().min(1).optional(),
  /**
   * When set, JWT key material is loaded from this Secrets Manager secret
   * (JSON with `privateKey` / `publicKey` PEM strings). Ignored when
   * JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are both set (local dev).
   */
  JWT_KEY_SECRET_ARN: z.string().min(1).optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 14),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates env: either inline PEM keys OR secret ARN must be available
 * (except in test where dummy keys may be injected by the harness).
 */
export const serverEnvRefinedSchema = serverEnvSchema.superRefine((val, ctx) => {
  const hasInlineKeys =
    val.JWT_PRIVATE_KEY !== undefined &&
    val.JWT_PRIVATE_KEY.length > 0 &&
    val.JWT_PUBLIC_KEY !== undefined &&
    val.JWT_PUBLIC_KEY.length > 0;
  const hasArn = val.JWT_KEY_SECRET_ARN !== undefined && val.JWT_KEY_SECRET_ARN.length > 0;
  if (val.NODE_ENV === 'test') {
    return;
  }
  if (!hasInlineKeys && !hasArn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Either JWT_PRIVATE_KEY + JWT_PUBLIC_KEY (local) or JWT_KEY_SECRET_ARN (AWS) must be set',
    });
  }
});

export type ServerEnvRefined = z.infer<typeof serverEnvRefinedSchema>;
