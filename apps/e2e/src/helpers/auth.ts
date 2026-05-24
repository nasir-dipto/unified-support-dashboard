import type { Page } from '@playwright/test';
import { DEMO_CREDENTIALS, type DemoRole } from '../constants/credentials.js';
import { LoginPage } from '../pages/LoginPage.js';

/**
 * Clears session storage so each test starts unauthenticated.
 */
export async function resetSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Signs in with a demo role and waits for the ticket queue.
 */
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await resetSession(page);
  const login = new LoginPage(page);
  const creds = DEMO_CREDENTIALS[role];
  await login.login(creds.orgId, creds.email, creds.password);
  await page.waitForURL('**/tickets', { timeout: 60_000 });
  await page.getByRole('heading', { name: 'Ticket Queue' }).waitFor({ state: 'visible' });
}
