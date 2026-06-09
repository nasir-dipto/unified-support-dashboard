import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Full-page ticket detail at `/tickets/:ticketId`.
 */
export class DetailModalPage {
  readonly root: Locator;
  readonly readOnlyBanner: Locator;
  readonly aiSuggestButton: Locator;
  readonly searchKbButton: Locator;
  readonly commentButton: Locator;
  readonly addNoteButton: Locator;
  readonly replyToCustomerButton: Locator;
  readonly backButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('main').or(page.locator('body'));
    this.readOnlyBanner = page.getByText(/read-only access to this ticket/i);
    this.aiSuggestButton = page.getByRole('button', { name: /ai: suggest action/i });
    this.searchKbButton = page.getByRole('button', { name: /^search kb$/i });
    this.commentButton = page.getByRole('button', { name: /^comment$/i });
    this.addNoteButton = page.getByRole('button', { name: /^add note$/i });
    this.replyToCustomerButton = page.getByRole('button', { name: /^reply to customer$/i });
    this.backButton = page.getByRole('button', { name: /back to tickets/i });
  }

  /**
   * Navigates back to the ticket queue.
   */
  async close(): Promise<void> {
    await this.backButton.click();
    await this.page.getByRole('heading', { name: 'Ticket Queue' }).waitFor({ state: 'visible' });
  }

  /**
   * Waits until ticket detail has loaded on the page.
   */
  async waitForLoaded(): Promise<void> {
    await expect(this.page.getByText('Loading ticket…')).toHaveCount(0, { timeout: 30_000 });
    await expect(this.page.getByRole('heading').first()).toBeVisible();
  }

  /**
   * Triggers KB search from the ticket detail page.
   */
  async searchKb(): Promise<void> {
    await this.searchKbButton.scrollIntoViewIfNeeded();
    await this.searchKbButton.click();
  }
}
