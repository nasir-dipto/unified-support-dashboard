import { expect, test } from '@playwright/test';
import { loginAs } from '../src/helpers/auth.js';
import { KnowledgeBasePage } from '../src/pages/KnowledgeBasePage.js';

test.describe('Knowledge Base', () => {
  test('KB page loads for admin', async ({ page }) => {
    await loginAs(page, 'admin');
    const kb = new KnowledgeBasePage(page);
    await kb.openFromNav();
    await expect(kb.heading).toBeVisible();
  });

  test('KB page loads for manager', async ({ page }) => {
    await loginAs(page, 'manager');
    const kb = new KnowledgeBasePage(page);
    await kb.openFromNav();
    await expect(kb.heading).toBeVisible();
  });

  test('KB page loads for technician', async ({ page }) => {
    await loginAs(page, 'technician');
    const kb = new KnowledgeBasePage(page);
    await kb.openFromNav();
    await expect(kb.heading).toBeVisible();
  });
});
