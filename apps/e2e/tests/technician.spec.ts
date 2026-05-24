import { expect, test } from '@playwright/test';
import { TECHNICIAN_ASSIGNEE_LABEL } from '../src/constants/credentials.js';
import { loginAs } from '../src/helpers/auth.js';
import { DetailModalPage } from '../src/pages/DetailModalPage.js';
import { TicketsPage } from '../src/pages/TicketsPage.js';

test.describe('Technician journeys', () => {
  test('My Tickets tab is default after login', async ({ page }) => {
    await loginAs(page, 'technician');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await expect(page.getByRole('button', { name: /^My tickets(\s+\d+)?$/i })).toHaveClass(
      /bg-gray-900/,
    );
    await expect(page.locator('span.font-bold').filter({ hasText: /^My tickets$/ })).toBeVisible();
  });

  test('All Tickets shows read-only banner for unassigned tickets', async ({ page }) => {
    await loginAs(page, 'technician');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await tickets.selectAllTab();

    const rows = tickets.ticketRows();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    let opened = false;
    for (let i = 0; i < rowCount; i += 1) {
      const row = rows.nth(i);
      const rowText = await row.textContent();
      if (rowText !== null && !rowText.includes(TECHNICIAN_ASSIGNEE_LABEL)) {
        await row.getByRole('button', { name: /^details$/i }).click();
        opened = true;
        break;
      }
    }

    expect(opened).toBe(true);
    const modal = new DetailModalPage(page);
    await expect(modal.readOnlyBanner).toBeVisible();
    await expect(modal.aiSuggestButton).toHaveCount(0);
  });

  test('assigned ticket DetailModal shows full write actions', async ({ page }) => {
    await loginAs(page, 'technician');
    const tickets = new TicketsPage(page);
    await tickets.waitForLoaded();
    await expect(page.getByRole('button', { name: /^My tickets(\s+\d+)?$/i })).toHaveClass(
      /bg-gray-900/,
    );

    await tickets.openTicketDetailsByIndex(0);
    const modal = new DetailModalPage(page);
    await modal.waitForLoaded();
    await expect(modal.readOnlyBanner).toHaveCount(0);
    await expect(modal.aiSuggestButton).toBeVisible();
    await expect(
      modal.commentButton.or(modal.addNoteButton).or(modal.replyToCustomerButton).first(),
    ).toBeVisible();
  });
});
