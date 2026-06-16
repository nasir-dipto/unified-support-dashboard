import axios from 'axios';

/**
 * Maps login API failures to user-facing messages (credentials, network, rate limit).
 */
export function resolveLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response === undefined) {
      return 'Cannot reach the API. The demo host may be offline — ask them to keep docker, pnpm dev, and cloudflared running, then hard-refresh this page.';
    }
    const status = error.response.status;
    if (status === 429) {
      return 'Too many login attempts. Wait a minute and try again.';
    }
    const data: unknown = error.response.data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const body = data as { error?: unknown };
      if (typeof body.error === 'string' && body.error.length > 0) {
        return body.error;
      }
    }
  }
  return 'Invalid email or password.';
}
