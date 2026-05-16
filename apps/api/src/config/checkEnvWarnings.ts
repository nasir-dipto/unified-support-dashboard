import { getServerEnv } from './loadEnv.js';

/**
 * Returns true when an integration env value is unset or blank.
 */
function isMissingOrBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

/**
 * Logs visible warnings (does not throw) when core integration env vars are not configured.
 */
export function checkEnvWarnings(): void {
  const env = getServerEnv();
  const missing: string[] = [];

  if (isMissingOrBlank(env.JIRA_WEBHOOK_SECRET)) {
    missing.push('JIRA_WEBHOOK_SECRET');
  }
  if (isMissingOrBlank(env.HD_WEBHOOK_SECRET)) {
    missing.push('HD_WEBHOOK_SECRET');
  }
  if (isMissingOrBlank(env.JIRA_URL)) {
    missing.push('JIRA_URL');
  }
  if (isMissingOrBlank(env.HELPDESK_URL)) {
    missing.push('HELPDESK_URL');
  }

  if (missing.length === 0) {
    return;
  }

  console.warn(
    `[api] Warning: integration environment not fully configured (${missing.join(', ')}). ` +
      'Jira/Helpdesk webhooks and sync will not work until these are set in .env.local.',
  );
}
