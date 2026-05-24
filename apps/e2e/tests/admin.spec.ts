import { expect, test } from '@playwright/test';
import { loginAs } from '../src/helpers/auth.js';
import { AdminPanelPage } from '../src/pages/AdminPanelPage.js';
import { AppHeaderPage } from '../src/pages/AppHeaderPage.js';

test.describe('Admin journeys', () => {
  test('can open Admin panel', async ({ page }) => {
    await loginAs(page, 'admin');
    const header = new AppHeaderPage(page);
    await header.adminLink.click();
    const admin = new AdminPanelPage(page);
    await expect(admin.heading).toBeVisible();
    await expect(page.getByRole('button', { name: /^users$/i })).toBeVisible();
  });

  test('can see Knowledge Base tab in Admin panel', async ({ page }) => {
    await loginAs(page, 'admin');
    const admin = new AdminPanelPage(page);
    await admin.openFromNav();
    await expect(admin.knowledgeBaseTab).toBeVisible();
    await admin.openKnowledgeBaseTab();
    await expect(page.getByRole('button', { name: /^published$/i })).toBeVisible();
  });
});
