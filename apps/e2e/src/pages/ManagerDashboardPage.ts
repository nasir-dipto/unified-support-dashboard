import type { Page, Locator } from '@playwright/test';

/**
 * Manager dashboard (/manager).
 */
export class ManagerDashboardPage {
  readonly heading: Locator;
  readonly reportingTab: Locator;
  readonly sentimentTab: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Management Dashboard' });
    this.reportingTab = page.getByRole('button', { name: /^reporting$/i });
    this.sentimentTab = page.getByRole('button', { name: /sentiment analysis/i });
  }

  /**
   * Navigates to the manager dashboard.
   */
  async goto(): Promise<void> {
    await this.page.goto('/manager');
    await this.heading.waitFor({ state: 'visible' });
  }

  /**
   * Opens the Reporting tab and waits for charts.
   */
  async openReportingTab(): Promise<void> {
    await this.reportingTab.click();
    await this.page.getByRole('heading', { name: 'Ticket volume' }).waitFor({ state: 'visible' });
  }

  /**
   * Opens the Sentiment analysis tab and waits for summary cards.
   */
  async openSentimentTab(): Promise<void> {
    await this.sentimentTab.click();
    await this.page.getByText(/Sentiment analysis applies to ManageEngine tickets only/i).waitFor({
      state: 'visible',
    });
    await this.page.getByText(/^Negative$/).first().waitFor({ state: 'visible' });
  }
}
