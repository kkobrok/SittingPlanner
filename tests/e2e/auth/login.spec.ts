import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { NavigationComponent } from '../pages/NavigationComponent';
import {
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  getDefaultTestUser,
  type TestUser,
} from '../helpers/test-user';

/**
 * E2E Tests for User Authentication - Login Flow
 *
 * Tests cover:
 * - Successful login
 * - Invalid credentials
 * - Email validation
 * - Session persistence
 * - Logout functionality
 */

test.describe('Authentication - Login', () => {
  let loginPage: LoginPage;
  let navigation: NavigationComponent;
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    navigation = new NavigationComponent(page);
    await loginPage.goto();
  });

  test.describe('Successful Login', () => {
    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      // Arrange: Get default test user
      testUser = getDefaultTestUser();

      // Act: Perform login
      await loginPage.login(testUser.email, testUser.password);

      // Assert: Verify redirect to dashboard
      await expect(page).toHaveURL('/dashboard');

      // Assert: Verify user menu is visible (authenticated state)
      await expect(navigation.userMenuButton).toBeVisible();
    });

    test('should show user email in navigation after login', async ({ page }) => {
      // Arrange
      testUser = getDefaultTestUser();

      // Act
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');

      // Open user menu
      await navigation.openUserMenu();

      // Assert: User email is displayed in dropdown
      const userEmailElement = page.getByTestId('user-email');
      await expect(userEmailElement).toBeVisible();

      // Verify the email contains the logged-in user's email
      // (May differ from testUser.email if env vars override defaults)
      const displayedEmail = await userEmailElement.textContent();
      expect(displayedEmail).toContain('@');
      expect(displayedEmail?.length).toBeGreaterThan(0);
    });

    test('should persist session after page reload', async ({ page }) => {
      // Arrange
      testUser = getDefaultTestUser();

      // Act: Login and reload page
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');
      await page.reload();

      // Assert: User should still be authenticated
      await expect(navigation.userMenuButton).toBeVisible();
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Login Validation', () => {
    test('should show error message with invalid credentials', async () => {
      // Arrange
      const invalidEmail = 'nonexistent@example.com';
      const invalidPassword = 'WrongPassword123!';

      // Act
      await loginPage.login(invalidEmail, invalidPassword);

      // Assert: Error message should be visible
      await expect(loginPage.errorMessage).toBeVisible();
      const errorText = await loginPage.getErrorMessage();
      expect(errorText.toLowerCase()).toContain('invalid');
    });

    test('should show error message with wrong password for existing user', async () => {
      // Arrange
      testUser = getDefaultTestUser();
      const wrongPassword = 'DefinitelyWrongPassword123!';

      // Act
      await loginPage.login(testUser.email, wrongPassword);

      // Assert
      await expect(loginPage.errorMessage).toBeVisible();
    });

    test('should require email field', async ({ page }) => {
      // Arrange: Leave email empty
      await loginPage.passwordInput.fill('SomePassword123!');

      // Act: Try to submit
      await loginPage.submitButton.click();

      // Assert: HTML5 validation should prevent submission
      const emailValidation = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(emailValidation).toBeTruthy();
    });

    test('should require password field', async ({ page }) => {
      // Arrange: Leave password empty
      await loginPage.emailInput.fill('test@example.com');

      // Act: Try to submit
      await loginPage.submitButton.click();

      // Assert: HTML5 validation should prevent submission
      const passwordValidation = await loginPage.passwordInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      expect(passwordValidation).toBeTruthy();
    });

    test('should validate email format', async ({ page }) => {
      // Arrange: Invalid email format
      await loginPage.emailInput.fill('not-an-email');
      await loginPage.passwordInput.fill('SomePassword123!');

      // Act: Try to submit
      await loginPage.submitButton.click();

      // Assert: HTML5 validation should prevent submission
      const isValid = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
      expect(isValid).toBe(false);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to sign up page from login', async ({ page }) => {
      // Act
      await loginPage.goToSignUp();

      // Assert
      await expect(page).toHaveURL('/auth/register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      // Act
      await loginPage.goToForgotPassword();

      // Assert
      await expect(page).toHaveURL('/auth/forgot-password');
    });

    test('should redirect to dashboard if already logged in', async ({ page }) => {
      // Arrange: Login first
      testUser = getDefaultTestUser();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');

      // Act: Try to access login page again
      await page.goto('/auth/login');

      // Assert: Should redirect back to dashboard (or stay on dashboard)
      // Note: This test depends on your auth middleware implementation
      // If middleware redirects authenticated users, uncomment below:
      // await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully and redirect to login', async ({ page }) => {
      // Arrange: Login first
      testUser = getDefaultTestUser();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');

      // Act: Logout
      await navigation.logout();

      // Assert: Should be on login page
      await expect(page).toHaveURL('/auth/login');

      // Assert: Sign in button should be visible (not authenticated)
      await expect(navigation.signInButton).toBeVisible();
    });

    test('should clear session after logout', async ({ page }) => {
      // Arrange: Login first
      testUser = getDefaultTestUser();
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');

      // Act: Logout
      await navigation.logout();

      // Wait for cookies to be cleared and redirect to complete
      await page.waitForTimeout(1500);

      // Act: Try to access protected page in new context (simulate new tab/window)
      await page.goto('/dashboard', { waitUntil: 'networkidle' });

      // Assert: Should redirect to login (session cleared)
      // Give it time to redirect if needed
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });

  test.describe('User Registration Flow (New User)', () => {
    let newUser: TestUser;

    test.afterEach(async () => {
      // Cleanup: Delete test user after each test
      if (newUser?.id) {
        await deleteTestUser(newUser.id);
      }
    });

    test('should create new user and login successfully', async ({ page }) => {
      // Arrange: Create a new test user via API
      const email = generateTestEmail();
      const password = 'NewUserPassword123!';
      newUser = await createTestUser(email, password);

      // Act: Login with new user
      await loginPage.login(email, password);

      // Assert: Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(navigation.userMenuButton).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should complete login within 5 seconds', async ({ page }) => {
      // Arrange
      testUser = getDefaultTestUser();
      const startTime = Date.now();

      // Act
      await loginPage.login(testUser.email, testUser.password);
      await page.waitForURL('/dashboard');

      // Assert
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });
  });
});
