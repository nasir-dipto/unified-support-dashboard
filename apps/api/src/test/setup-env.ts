import { generateKeyPairSync } from 'node:crypto';
import { loadServerEnv } from '../config/loadEnv.js';

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
  process.env.JIRA_DEFAULT_ORG_ID = 'org-int';
}
if (process.env.HD_WEBHOOK_SECRET === undefined) {
  process.env.HD_WEBHOOK_SECRET = 'test-hd-webhook-secret';
}
if (process.env.SUPPORT_TICKET_COMMENTS_TABLE === undefined) {
  process.env.SUPPORT_TICKET_COMMENTS_TABLE = 'support_ticket_comments_test';
}
if (process.env.HD_DEFAULT_ORG_ID === undefined) {
  process.env.HD_DEFAULT_ORG_ID = 'org-int';
}

loadServerEnv();