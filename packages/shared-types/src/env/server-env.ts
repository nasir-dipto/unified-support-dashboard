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
  /** Redis connection URL (health checks and future cache/session use). */
  REDIS_URL: z.string().min(1).optional(),
  SUPPORT_USERS_TABLE: z.string().min(1).default('support_users'),
  SUPPORT_ROLES_TABLE: z.string().min(1).default('support_roles'),
  SUPPORT_TICKETS_TABLE: z.string().min(1).default('support_tickets'),
  /** Jira Cloud site base URL (e.g. https://your.atlassian.net). */
  JIRA_URL: z.string().url().optional(),
  /** Jira Cloud account email (Basic Auth username). */
  JIRA_EMAIL: z.string().min(1).optional(),
  /** Jira Cloud API token (Basic Auth password). */
  JIRA_API_TOKEN: z.string().min(1).optional(),
  /** Secret for `x-hub-signature-256` verification on `POST /api/webhooks/jira`. */
  JIRA_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** Org id stamped on tickets ingested from Jira when the payload has no org. */
  JIRA_DEFAULT_ORG_ID: z.string().min(1).default('demo-org'),
  /**
   * Comma-separated Jira project keys to sync/process (e.g. `SCRUM,TPDI,TRL`).
   * When unset or empty, all accessible projects are included.
   */
  JIRA_INCLUDE_PROJECTS: z.string().optional(),
  /**
   * ManageEngine ServiceDesk Plus Cloud API base (e.g. https://servicedeskplus.uk/app/itdesk/api/v3).
   * All HD REST calls use this URL only (not zohoapis host).
   */
  HELPDESK_URL: z.string().url().optional(),
  /** Zoho accounts domain segment (e.g. zoho.uk → https://accounts.zoho.uk/oauth/v2/token). */
  ZOHO_DOMAIN: z.string().min(1).default('zoho.uk'),
  HD_CLIENT_ID: z.string().min(1).optional(),
  HD_CLIENT_SECRET: z.string().min(1).optional(),
  HD_REFRESH_TOKEN: z.string().min(1).optional(),
  /** Org id for Helpdesk-ingested tickets (webhook + reconcile). */
  HD_DEFAULT_ORG_ID: z.string().min(1).default('demo-org'),
  /** Shared secret matched against `x-sdp-webhook-secret` on POST /api/webhooks/helpdesk. */
  HD_WEBHOOK_SECRET: z.string().min(1).optional(),
  /**
   * When `true`, USD enables POST customer email replies to Helpdesk (`/requests/{id}/reply`).
   * Default false — UI shows disabled "Reply to Customer" until mail is configured in HD.
   */
  HELPDESK_EMAIL_REPLY_ENABLED: z.enum(['true', 'false']).optional(),
  /** Local Express attaches `ws`; production uses API Gateway WebSocket later. */
  WS_MODE: z.enum(['local', 'gateway']).default('local'),
  /** When `true`, skips inline JWT env requirements for queue worker Lambdas. */
  LAMBDA_WEBHOOK_WORKER: z.enum(['true', 'false']).optional(),
  /** DynamoDB table for USD-authored ticket comments (`support_ticket_comments`). */
  SUPPORT_TICKET_COMMENTS_TABLE: z.string().min(1).default('support_ticket_comments'),
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
  /**
   * When `true`, AI routes return mock JSON (no Bedrock). Default for local dev.
   */
  USE_MOCK_AI: z.enum(['true', 'false']).optional(),
  /** Bedrock foundation model id for Claude invoke. */
  BEDROCK_MODEL_ID: z
    .string()
    .min(1)
    .default('anthropic.claude-3-5-sonnet-20241022-v2:0'),
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
  if (val.NODE_ENV === 'test' || val.LAMBDA_WEBHOOK_WORKER === 'true') {
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
