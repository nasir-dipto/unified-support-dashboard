import type { ServerEnvRefined } from '@usd/shared-types';

/**
 * Returns true when Helpdesk customer email replies are enabled via env.
 */
export function isHelpdeskEmailReplyEnabled(env: Pick<ServerEnvRefined, 'HELPDESK_EMAIL_REPLY_ENABLED'>): boolean {
  return env.HELPDESK_EMAIL_REPLY_ENABLED === 'true';
}
