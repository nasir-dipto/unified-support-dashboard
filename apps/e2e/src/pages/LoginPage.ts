import type { Page, Locator } from '@playwright/test';

/**
 * Login page interactions.
 */
export class LoginPage {
  readonly orgIdInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.orgIdInput = page.locator('#orgId');
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.getByRole('button', { name: /^sign in$/i });
  }

  /**
   * Fills credentials and submits the login form.
   */
  async login(orgId: string, email: string, password: string): Promise<void> {
    await this.orgIdInput.fill(orgId);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
