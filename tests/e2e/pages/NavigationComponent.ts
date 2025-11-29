import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Top Navigation Component
 *
 * Handles interactions with the top navigation bar
 * which appears across all authenticated pages
 */
export class NavigationComponent {
  readonly page: Page;
  readonly topNav: Locator;
  readonly appLogo: Locator;
  readonly dashboardLink: Locator;
  readonly userMenuButton: Locator;
  readonly userMenuDropdown: Locator;
  readonly logoutButton: Locator;
  readonly signInButton: Locator;
  readonly signUpButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topNav = page.getByTestId("top-nav");
    this.appLogo = page.getByTestId("app-logo");
    this.dashboardLink = page.getByTestId("nav-dashboard-link");
    this.userMenuButton = page.getByTestId("user-menu-button");
    this.userMenuDropdown = page.getByTestId("user-menu-dropdown");
    this.logoutButton = page.getByTestId("logout-button");
    this.signInButton = page.getByTestId("sign-in-button");
    this.signUpButton = page.getByTestId("sign-up-button");
  }

  /**
   * Check if user is authenticated (user menu visible)
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.userMenuButton.isVisible();
  }

  /**
   * Check if user is not authenticated (sign in button visible)
   */
  async isNotAuthenticated(): Promise<boolean> {
    return await this.signInButton.isVisible();
  }

  /**
   * Open user menu dropdown
   */
  async openUserMenu() {
    await this.userMenuButton.click();
    await this.userMenuDropdown.waitFor({ state: "visible" });
  }

  /**
   * Logout from the application
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
    // Wait for redirect to login page
    await this.page.waitForURL("/auth/login", { timeout: 10000 });
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard() {
    await this.dashboardLink.click();
  }

  /**
   * Navigate to login page (for unauthenticated users)
   */
  async goToLogin() {
    await this.signInButton.click();
  }

  /**
   * Navigate to sign up page (for unauthenticated users)
   */
  async goToSignUp() {
    await this.signUpButton.click();
  }

  /**
   * Click on app logo to go to homepage/dashboard
   */
  async clickAppLogo() {
    await this.appLogo.click();
  }
}
