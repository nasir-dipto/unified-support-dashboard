import type { Page, Locator } from '@playwright/test';

/**
 * Top navigation header (AppHeader).
 */
export class AppHeaderPage {
  readonly ticketsLink: Locator;
  readonly knowledgeBaseLink: Locator;
  readonly managerLink: Locator;
  readonly adminLink: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.ticketsLink = page.getByRole('link', { name: 'Tickets' });
    this.knowledgeBaseLink = page.getByRole('link', { name: 'Knowledge Base' });
    this.managerLink = page.getByRole('link', { name: 'Manager' });
    this.adminLink = page.getByRole('link', { name: 'Admin' });
    this.logoutButton = page.getByRole('button', { name: /^logout$/i });
  }

  /**
   * Signs out and waits for the login screen.
   */
  async logout(): Promise<void> {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}
