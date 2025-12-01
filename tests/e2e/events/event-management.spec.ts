import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { NavigationComponent } from "../pages/NavigationComponent";
import {
  getDefaultTestUser,
  setupTestData,
  cleanupUserData,
  createEventViaBrowser,
  type TestUser,
} from "../helpers/test-user";

/**
 * E2E Tests for Event Management
 *
 * Tests cover:
 * - Viewing events dashboard
 * - Creating new events
 * - Editing existing events
 * - Deleting events
 * - Event data persistence
 *
 * Note: These tests are skipped when DISABLE_AUTH=true (e.g., in CI without Supabase)
 */

test.describe("Event Management", () => {
  // Skip all event management tests if auth is disabled (requires real Supabase)
  test.skip(process.env.DISABLE_AUTH === "true", "Skipping event management tests - DISABLE_AUTH is enabled");
  let loginPage: LoginPage;
  let navigation: NavigationComponent;
  let testUser: TestUser;

  test.beforeEach(async ({ page, context }) => {
    testUser = getDefaultTestUser();
    loginPage = new LoginPage(page);
    navigation = new NavigationComponent(page);

    // Clear all cookies and storage to ensure clean state
    await context.clearCookies();
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Login before each test
    await loginPage.goto();
    await loginPage.login(testUser.email, testUser.password);
    await page.waitForURL("/dashboard");

    // Cleanup any existing test data after login to ensure clean state
    await cleanupUserData(testUser.email, testUser.password);

    // Reload dashboard to reflect the cleanup
    await page.reload({ waitUntil: "networkidle" });
  });

  test.afterEach(async () => {
    // Cleanup test data after each test
    await cleanupUserData(testUser.email, testUser.password);
  });

  test.describe("Dashboard View", () => {
    test("should display empty state when no events exist", async ({ page }) => {
      // Navigate to dashboard (already there from login)
      // Wait for either skeleton to disappear OR empty state to appear
      try {
        await page.waitForSelector(".skeleton-card", { state: "detached", timeout: 15000 });
      } catch (e) {
        // If skeleton doesn't detach, check if content is already loaded
        console.log("Skeleton did not detach, checking for content");
      }
      await expect(page.getByText(/no events yet/i)).toBeVisible({ timeout: 10000 });
    });

    test("should display events list when events exist", async ({ page }) => {
      // Arrange: Create test event using browser's session
      await createEventViaBrowser(page, {
        name: "Wedding Reception",
        date: "2025-06-15",
      });

      // Act: Reload page to see the event
      await page.reload({ waitUntil: "networkidle" });

      // Wait for either skeleton to disappear OR event to appear
      try {
        await page.waitForSelector(".skeleton-card", { state: "detached", timeout: 15000 });
      } catch (e) {
        console.log("Skeleton did not detach, checking for event");
      }

      // Assert: Event should be visible
      await expect(page.getByText("Wedding Reception")).toBeVisible({ timeout: 10000 });
    });

    test("should display multiple events", async ({ page }) => {
      // Arrange: Create multiple events using browser's session
      await createEventViaBrowser(page, {
        name: "Event 1",
        date: new Date().toISOString().split("T")[0],
      });
      await createEventViaBrowser(page, {
        name: "Event 2",
        date: new Date().toISOString().split("T")[0],
      });

      // Act: Reload page
      await page.reload({ waitUntil: "networkidle" });

      // Wait for either skeleton to disappear OR events to appear
      try {
        await page.waitForSelector(".skeleton-card", { state: "detached", timeout: 15000 });
      } catch (e) {
        console.log("Skeleton did not detach, checking for events");
      }

      // Assert: Both events should be visible
      await expect(page.getByText("Event 1")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Event 2")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Create Event", () => {
    test("should create a new event with valid data", async ({ page }) => {
      // Open create event modal
      await page
        .getByRole("button", { name: /create event/i })
        .first()
        .click();

      // Fill in event details (modal form) - use specific IDs to avoid conflict with edit modal
      await page.locator("#eventName").fill("Birthday Party");
      await page.locator("#eventDate").fill("2025-07-20");

      // Submit form (should stay on dashboard)
      await page
        .getByRole("button", { name: /create event/i })
        .last()
        .click();

      // Wait for the modal to close and skeleton loaders to disappear
      try {
        await page.waitForSelector(".skeleton-card", { state: "detached", timeout: 15000 });
      } catch (e) {
        console.log("Skeleton did not detach after create, checking for event");
      }

      // Assert: Event should appear in list - use .first() since there may be duplicates in DOM
      await expect(page.getByText("Birthday Party").first()).toBeVisible({ timeout: 10000 });
    });

    test("should validate required fields", async ({ page }) => {
      // Open create event modal
      await page
        .getByRole("button", { name: /create event/i })
        .first()
        .click();

      // Try to submit without filling required fields
      await page
        .getByRole("button", { name: /create event/i })
        .last()
        .click();

      // Assert: HTML5 validation prevents submit
      // The form should still be visible (not closed) - use specific ID for create modal
      await expect(page.locator("#eventName")).toBeVisible();
    });
  });

  test.describe("Event Details", () => {
    test.skip("should display event details with guests and tables", async ({ page }) => {
      // TODO: Implement /events/:id page
      // Arrange: Create event with guests and tables
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Test Wedding",
        guestCount: 10,
        tableCount: 2,
      });

      // Act: Navigate to event details
      await page.goto(`/events/${eventId}`);

      // Assert: Event name should be visible
      await expect(page.getByText("Test Wedding")).toBeVisible();

      // Assert: Guest count should be displayed
      await expect(page.getByText(/10.*guests?/i)).toBeVisible();

      // Assert: Table count should be displayed
      await expect(page.getByText(/2.*tables?/i)).toBeVisible();
    });

    test.skip("should navigate to guests page from event details", async ({ page }) => {
      // TODO: Implement /events/:id page
      // Arrange: Create event
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Test Event",
      });

      // Act: Navigate to event and click guests link
      await page.goto(`/events/${eventId}`);
      await page.getByRole("link", { name: /guests/i }).click();

      // Assert: Should be on guests page
      await expect(page).toHaveURL(`/events/${eventId}/guests`);
    });

    test.skip("should navigate to tables page from event details", async ({ page }) => {
      // TODO: Implement /events/:id page
      // Arrange: Create event
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Test Event",
      });

      // Act: Navigate to event and click tables link
      await page.goto(`/events/${eventId}`);
      await page.getByRole("link", { name: /tables/i }).click();

      // Assert: Should be on tables page
      await expect(page).toHaveURL(`/events/${eventId}/tables`);
    });
  });

  test.describe("Edit Event", () => {
    test.skip("should update event details", async ({ page }) => {
      // TODO: Update test to use edit modal on dashboard instead of /events/:id/edit page
      // Arrange: Create event
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Original Name",
        eventDate: "2025-08-01",
      });

      // Act: Navigate to edit page
      await page.goto(`/events/${eventId}/edit`);

      // Update event name
      await page.getByLabel(/event name/i).fill("Updated Name");

      // Save changes
      await page.getByRole("button", { name: /save|update/i }).click();

      // Assert: Success message
      await expect(page.getByText(/updated|saved/i)).toBeVisible();

      // Assert: New name should be visible
      await page.goto(`/events/${eventId}`);
      await expect(page.getByText("Updated Name")).toBeVisible();
    });
  });

  test.describe("Delete Event", () => {
    test.skip("should delete event after confirmation", async ({ page }) => {
      // TODO: Update test to use delete modal on dashboard instead of /events/:id page
      // Arrange: Create event
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Event to Delete",
      });

      // Act: Navigate to event
      await page.goto(`/events/${eventId}`);

      // Click delete button
      await page.getByRole("button", { name: /delete/i }).click();

      // Confirm deletion
      await page.getByRole("button", { name: /confirm|yes/i }).click();

      // Assert: Should redirect to dashboard
      await expect(page).toHaveURL("/dashboard");

      // Assert: Event should not be in list
      await expect(page.getByText("Event to Delete")).not.toBeVisible();
    });

    test.skip("should cancel deletion when user cancels", async ({ page }) => {
      // TODO: Update test to use delete modal on dashboard instead of /events/:id page
      // Arrange: Create event
      const eventId = await setupTestData(testUser.email, testUser.password, {
        eventName: "Event to Keep",
      });

      // Act: Navigate to event
      await page.goto(`/events/${eventId}`);

      // Click delete button
      await page.getByRole("button", { name: /delete/i }).click();

      // Cancel deletion
      await page.getByRole("button", { name: /cancel|no/i }).click();

      // Assert: Should stay on event page
      await expect(page).toHaveURL(`/events/${eventId}`);

      // Assert: Event should still exist
      await page.goto("/dashboard");
      await expect(page.getByText("Event to Keep")).toBeVisible();
    });
  });

  test.describe("Data Isolation", () => {
    test.skip("should only show events owned by logged-in user", async ({ page }) => {
      // TODO: Fix session expiration issue in setupTestData
      // This test verifies RLS policies are working
      // Only the authenticated user's events should be visible

      // Arrange: Create event for current user
      await setupTestData(testUser.email, testUser.password, {
        eventName: "My Event",
      });

      // Act: View dashboard
      await page.goto("/dashboard");

      // Assert: User should see their own event
      await expect(page.getByText("My Event")).toBeVisible();

      // Note: In a full test, we would create another user and verify
      // their events are NOT visible to this user
    });
  });
});
