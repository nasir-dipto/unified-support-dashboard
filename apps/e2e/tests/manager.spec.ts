import { expect, test } from '@playwright/test';
import { loginAs } from '../src/helpers/auth.js';
import { AppHeaderPage } from '../src/pages/AppHeaderPage.js';
import { ManagerDashboardPage } from '../src/pages/ManagerDashboardPage.js';
import { TicketsPage } from '../src/pages/TicketsPage.js';

test.describe('Manager journeys', () => {
  test('can view all tickets on the queue', async ({ page }) => {
    await loginAs(page, 'manager');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await expect(tickets.ticketArticles.first()).toBeVisible();
    await tickets.selectAllTab();
    await expect(page.locator('span.font-bold').filter({ hasText: /^All tickets$/ })).toBeVisible();
  });

  test('can open Manager Reporting tab and see charts', async ({ page }) => {
    await loginAs(page, 'manager');
    const header = new AppHeaderPage(page);
    await header.managerLink.click();
    const manager = new ManagerDashboardPage(page);
    await manager.openReportingTab();
    await expect(page.getByRole('heading', { name: 'Ticket volume' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Opened vs resolved' })).toBeVisible();
  });

  test('can open Manager Sentiment tab', async ({ page }) => {
    await loginAs(page, 'manager');
    const header = new AppHeaderPage(page);
    await header.managerLink.click();
    const manager = new ManagerDashboardPage(page);
    await manager.openSentimentTab();
    await expect(page.getByRole('heading', { name: 'Trend — 7 weeks' })).toBeVisible();
  });
});
