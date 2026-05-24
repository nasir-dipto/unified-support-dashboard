import type { FullConfig } from '@playwright/test';

const WEB_ORIGIN = 'http://localhost:5173';
const API_ORIGIN = 'http://localhost:3001';
const REQUEST_TIMEOUT_MS = 8_000;

/**
 * Verifies a local dev URL responds before Playwright tests start.
 */
async function assertReachable(label: string, url: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      [
        `${label} is not reachable at ${url}.`,
        'Start local services first:',
        '  docker compose up -d',
        '  pnpm dev',
        `Detail: ${detail}`,
      ].join('\n'),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Playwright global setup — fails fast when web or API dev servers are down.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  await assertReachable('Web dev server (Vite)', `${WEB_ORIGIN}/login`);
  await assertReachable('API server (Express)', `${API_ORIGIN}/api/health/detail`);
}
