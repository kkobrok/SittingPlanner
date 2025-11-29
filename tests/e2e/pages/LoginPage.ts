import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for Login Page
 *
 * Encapsulates all interactions with the login page
 * following the Page Object pattern for maintainability
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('submit-button');
    this.errorMessage = page.getByTestId('login-error-message');
    this.forgotPasswordLink = page.getByTestId('forgot-password-link');
    this.signUpLink = page.getByTestId('sign-up-link');
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/auth/login');
  }

  /**
   * Fill in the login form with email and password
   */
  async fillLoginForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow: fill form and submit
   */
  async login(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submit();
  }

  /**
   * Wait for navigation after successful login
   * @param expectedUrl - Optional URL to wait for (defaults to /dashboard)
   */
  async waitForSuccessfulLogin(expectedUrl: string = '/dashboard') {
    await this.page.waitForURL(expectedUrl, { timeout: 10000 });
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible' });
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if error message is visible
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Navigate to sign up page
   */
  async goToSignUp() {
    await this.signUpLink.click();
  }

  /**
   * Navigate to forgot password page
   */
  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
