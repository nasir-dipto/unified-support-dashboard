import { expect, test } from '@playwright/test';
import { loginAs } from '../src/helpers/auth.js';
import { DetailModalPage } from '../src/pages/DetailModalPage.js';
import { TicketsPage } from '../src/pages/TicketsPage.js';

test.describe('Ticket interactions', () => {
  test('opens ticket DetailModal from queue', async ({ page }) => {
    await loginAs(page, 'manager');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await tickets.openTicketDetailsByIndex(0);
    const modal = new DetailModalPage(page);
    await modal.waitForLoaded();
    await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  });

  test('can search KB from DetailModal', async ({ page }) => {
    await loginAs(page, 'manager');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await tickets.openTicketDetailsByIndex(0);
    const modal = new DetailModalPage(page);
    await modal.waitForLoaded();
    await modal.searchKb();
    await expect(
      page
        .getByText(/searching knowledge base/i)
        .or(page.getByText(/no matching published articles/i)),
    ).toBeVisible({ timeout: 15_000 });
  });
});
