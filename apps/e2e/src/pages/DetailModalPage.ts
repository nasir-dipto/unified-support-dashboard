import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Ticket DetailModal overlay.
 */
export class DetailModalPage {
  readonly dialog: Locator;
  readonly readOnlyBanner: Locator;
  readonly aiSuggestButton: Locator;
  readonly searchKbButton: Locator;
  readonly commentButton: Locator;
  readonly addNoteButton: Locator;
  readonly replyToCustomerButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.getByRole('dialog');
    this.readOnlyBanner = this.dialog.getByText(/read-only access to this ticket/i);
    this.aiSuggestButton = this.dialog.getByRole('button', { name: /ai: suggest action/i });
    this.searchKbButton = this.dialog.getByRole('button', { name: /^search kb$/i });
    this.commentButton = this.dialog.getByRole('button', { name: /^comment$/i });
    this.addNoteButton = this.dialog.getByRole('button', { name: /^add note$/i });
    this.replyToCustomerButton = this.dialog.getByRole('button', { name: /^reply to customer$/i });
    this.closeButton = this.dialog.getByRole('button', { name: /close dialog/i });
  }

  /**
   * Closes the detail modal.
   */
  async close(): Promise<void> {
    await this.closeButton.click();
    await this.dialog.waitFor({ state: 'hidden' });
  }

  /**
   * Waits until ticket detail has loaded inside the modal.
   */
  async waitForLoaded(): Promise<void> {
    await expect(this.dialog.getByText('Loading ticket…')).toHaveCount(0, { timeout: 30_000 });
  }

  /**
   * Triggers KB search from the modal.
   */
  async searchKb(): Promise<void> {
    await this.searchKbButton.scrollIntoViewIfNeeded();
    await this.searchKbButton.click();
  }
}
