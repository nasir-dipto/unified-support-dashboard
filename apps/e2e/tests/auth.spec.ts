import { expect, test } from '@playwright/test';
import { loginAs } from '../src/helpers/auth.js';
import { AppHeaderPage } from '../src/pages/AppHeaderPage.js';

test.describe('Auth flows', () => {
  test('admin sees Tickets, Knowledge Base, Manager, and Admin tabs', async ({ page }) => {
    await loginAs(page, 'admin');
    const header = new AppHeaderPage(page);
    await expect(header.ticketsLink).toBeVisible();
    await expect(header.knowledgeBaseLink).toBeVisible();
    await expect(header.managerLink).toBeVisible();
    await expect(header.adminLink).toBeVisible();
  });

  test('manager sees Tickets, Knowledge Base, and Manager tabs (no Admin)', async ({ page }) => {
    await loginAs(page, 'manager');
    const header = new AppHeaderPage(page);
    await expect(header.ticketsLink).toBeVisible();
    await expect(header.knowledgeBaseLink).toBeVisible();
    await expect(header.managerLink).toBeVisible();
    await expect(header.adminLink).toHaveCount(0);
  });

  test('technician sees Tickets and Knowledge Base tabs only', async ({ page }) => {
    await loginAs(page, 'technician');
    const header = new AppHeaderPage(page);
    await expect(header.ticketsLink).toBeVisible();
    await expect(header.knowledgeBaseLink).toBeVisible();
    await expect(header.managerLink).toHaveCount(0);
    await expect(header.adminLink).toHaveCount(0);
  });

  test('logout returns to login screen', async ({ page }) => {
    await loginAs(page, 'admin');
    const header = new AppHeaderPage(page);
    await header.logout();
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible();
  });
});
