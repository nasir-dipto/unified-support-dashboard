import type { Page, Locator } from '@playwright/test';

/**
 * Admin panel (/admin).
 */
export class AdminPanelPage {
  readonly heading: Locator;
  readonly knowledgeBaseTab: Locator;
  readonly navLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Admin Panel' });
    this.knowledgeBaseTab = page.getByRole('button', { name: /^knowledge base$/i });
    this.navLink = page.getByRole('link', { name: 'Admin' });
  }

  /**
   * Opens admin via client-side nav (auth is in-memory; full reload would log out).
   */
  async openFromNav(): Promise<void> {
    await this.navLink.click();
    await this.page.waitForURL('**/admin');
    await this.heading.waitFor({ state: 'visible' });
  }

  /**
   * Opens the Knowledge Base admin tab.
   */
  async openKnowledgeBaseTab(): Promise<void> {
    await this.knowledgeBaseTab.click();
    await this.page
      .getByText(/Draft articles are saved without embeddings/i)
      .waitFor({ state: 'visible' });
  }
}
