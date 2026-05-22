import { generateKeyPairSync } from 'node:crypto';
import { loadServerEnv } from '../config/loadEnv.js';

// DYNAMODB_ENDPOINT / REDIS_URL must come from the parent process (CI job env or local shell).
// Turbo `globalPassThroughEnv` forwards them into `pnpm test`; Vitest `test.env` mirrors them for workers.

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY = privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
process.env.JWT_PUBLIC_KEY = publicKey
  .export({ type: 'spki', format: 'pem' })
  .toString();
process.env.AWS_REGION = 'us-east-1';
if (process.env.SUPPORT_USERS_TABLE === undefined) {
  process.env.SUPPORT_USERS_TABLE = 'support_users_test';
}
if (process.env.SUPPORT_ROLES_TABLE === undefined) {
  process.env.SUPPORT_ROLES_TABLE = 'support_roles_test';
}
if (process.env.SUPPORT_TICKETS_TABLE === undefined) {
  process.env.SUPPORT_TICKETS_TABLE = 'support_tickets_test';
}
if (process.env.JIRA_WEBHOOK_SECRET === undefined) {
  process.env.JIRA_WEBHOOK_SECRET = 'test-webhook-secret';
}
if (process.env.JIRA_DEFAULT_ORG_ID === undefined) {
  process.env.JIRA_DEFAULT_ORG_ID = 'demo-org';
}
if (process.env.HD_WEBHOOK_SECRET === undefined) {
  process.env.HD_WEBHOOK_SECRET = 'test-hd-webhook-secret';
}
if (process.env.SUPPORT_TICKET_COMMENTS_TABLE === undefined) {
  process.env.SUPPORT_TICKET_COMMENTS_TABLE = 'support_ticket_comments_test';
}
if (process.env.SUPPORT_NOTIFICATIONS_TABLE === undefined) {
  process.env.SUPPORT_NOTIFICATIONS_TABLE = 'support_notifications_test';
}
if (process.env.SUPPORT_NOTIFICATION_RULES_TABLE === undefined) {
  process.env.SUPPORT_NOTIFICATION_RULES_TABLE = 'support_notification_rules_test';
}
if (process.env.SUPPORT_AUTH_TOKENS_TABLE === undefined) {
  process.env.SUPPORT_AUTH_TOKENS_TABLE = 'support_auth_tokens_test';
}
if (process.env.WEB_APP_URL === undefined) {
  process.env.WEB_APP_URL = 'http://localhost:5173';
}
if (process.env.HD_DEFAULT_ORG_ID === undefined) {
  process.env.HD_DEFAULT_ORG_ID = 'demo-org';
}
if (process.env.USE_MOCK_AI === undefined) {
  process.env.USE_MOCK_AI = 'true';
}

loadServerEnv();