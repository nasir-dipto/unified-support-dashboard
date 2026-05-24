import type { Page, Locator } from '@playwright/test';

/**
 * Technician ticket queue (/tickets).
 */
export class TicketsPage {
  readonly heading: Locator;
  readonly allTab: Locator;
  readonly myTicketsTab: Locator;
  readonly ticketArticles: Locator;
  readonly detailsButtons: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Ticket Queue' });
    this.allTab = page.getByRole('button', { name: /^All(\s+\d+)?$/i }).first();
    this.myTicketsTab = page.getByRole('button', { name: /^My tickets(\s+\d+)?$/i });
    this.ticketArticles = page.getByRole('article');
    this.detailsButtons = page.getByRole('button', { name: /^details$/i });
  }

  /**
   * Waits for the ticket list to finish loading.
   */
  async waitForLoaded(): Promise<void> {
    await this.heading.waitFor({ state: 'visible' });
    await this.page.getByText(/Loading tickets/i).waitFor({ state: 'hidden' }).catch(() => {
      /* already loaded */
    });
  }

  /**
   * Switches to the All tickets view pill.
   */
  async selectAllTab(): Promise<void> {
    await this.allTab.click();
    await this.page.getByText(/^All tickets$/i).waitFor({ state: 'visible' });
  }

  /**
   * Switches to the My tickets view pill.
   */
  async selectMyTicketsTab(): Promise<void> {
    await this.myTicketsTab.click();
    await this.page.getByText(/^My tickets$/i).waitFor({ state: 'visible' });
  }

  /**
   * Opens the detail modal for the ticket at the given index.
   */
  async openTicketDetailsByIndex(index: number): Promise<void> {
    await this.detailsButtons.nth(index).click();
    await this.page.getByRole('dialog').waitFor({ state: 'visible' });
  }

  /**
   * Returns ticket row locators for iteration.
   */
  ticketRows(): Locator {
    return this.ticketArticles;
  }
}
