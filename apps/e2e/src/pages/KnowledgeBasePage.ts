import type { Page, Locator } from '@playwright/test';

/**
 * Published knowledge base browse page (/kb).
 */
export class KnowledgeBasePage {
  readonly heading: Locator;
  readonly navLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Knowledge Base' });
    this.navLink = page.getByRole('link', { name: 'Knowledge Base' });
  }

  /**
   * Opens KB via client-side nav (auth is in-memory; full reload would log out).
   */
  async openFromNav(): Promise<void> {
    await this.navLink.click();
    await this.page.waitForURL('**/kb');
    await this.heading.waitFor({ state: 'visible' });
  }
}
