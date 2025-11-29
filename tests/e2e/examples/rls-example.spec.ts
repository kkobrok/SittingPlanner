import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  setupTestData,
  cleanupUserData,
  generateTestEmail,
  getDefaultTestUser,
  createAuthenticatedClient,
  type TestUser,
} from "../helpers/test-user";
import { LoginPage } from "../pages/LoginPage";

/**
 * Example E2E Test: Row-Level Security (RLS) Verification
 *
 * This test demonstrates:
 * 1. How to create multiple test users
 * 2. How to set up test data with authenticated clients
 * 3. How to verify RLS policies prevent data leakage between users
 * 4. Proper cleanup of test data
 *
 * NOTE: These tests require /events/:id pages which are not yet implemented
 */

test.describe.skip("RLS Example: Data Isolation", () => {
  let user1: TestUser;
  let user2: TestUser;
  let user1EventId: string;
  let user2EventId: string;

  test.beforeAll(async () => {
    // Create two separate test users
    const email1 = generateTestEmail("user1");
    const email2 = generateTestEmail("user2");
    const password = "TestPassword123!";

    user1 = await createTestUser(email1, password);
    user2 = await createTestUser(email2, password);

    // Create test data for each user
    user1EventId = await setupTestData(user1.email, user1.password, {
      eventName: "User 1 Event",
      guestCount: 5,
      tableCount: 1,
    });

    user2EventId = await setupTestData(user2.email, user2.password, {
      eventName: "User 2 Event",
      guestCount: 10,
      tableCount: 2,
    });
  });

  test.afterAll(async () => {
    // Cleanup test data for both users
    await cleanupUserData(user1.email, user1.password);
    await cleanupUserData(user2.email, user2.password);

    // Delete test users
    if (user1.id) await deleteTestUser(user1.id);
    if (user2.id) await deleteTestUser(user2.id);
  });

  test("User 1 should only see their own events", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as User 1
    await loginPage.goto();
    await loginPage.login(user1.email, user1.password);
    await page.waitForURL("/dashboard");

    // Verify User 1 sees their own event
    await expect(page.getByText("User 1 Event")).toBeVisible();

    // Verify User 1 does NOT see User 2's event
    await expect(page.getByText("User 2 Event")).not.toBeVisible();
  });

  test("User 2 should only see their own events", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as User 2
    await loginPage.goto();
    await loginPage.login(user2.email, user2.password);
    await page.waitForURL("/dashboard");

    // Verify User 2 sees their own event
    await expect(page.getByText("User 2 Event")).toBeVisible();

    // Verify User 2 does NOT see User 1's event
    await expect(page.getByText("User 1 Event")).not.toBeVisible();
  });

  test("User 1 cannot access User 2 event directly via URL", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Login as User 1
    await loginPage.goto();
    await loginPage.login(user1.email, user1.password);
    await page.waitForURL("/dashboard");

    // Try to access User 2's event directly
    await page.goto(`/events/${user2EventId}`);

    // Should either redirect or show "not found" / "unauthorized"
    // The exact behavior depends on your implementation
    await expect(page.getByText(/not found|unauthorized|access denied/i))
      .toBeVisible()
      .catch(() => {
        // Or verify it redirected away from the event page
        expect(page.url()).not.toContain(user2EventId);
      });
  });

  test("API level: User 1 cannot fetch User 2 event data", async () => {
    // This test verifies RLS at the database level
    const supabase1 = await createAuthenticatedClient(user1.email, user1.password);

    // Try to fetch User 2's event
    const { data, error } = await supabase1.from("events").select("*").eq("id", user2EventId).single();

    // Should return no data (RLS blocks access)
    expect(data).toBeNull();
    // May return error or just empty result depending on RLS policy
    // expect(error).toBeTruthy();

    await supabase1.auth.signOut();
  });

  test("API level: User 1 can only see their own guests", async () => {
    const supabase1 = await createAuthenticatedClient(user1.email, user1.password);

    // Fetch all guests
    const { data: guests } = await supabase1.from("guests").select("*");

    // Should only return User 1's guests (5 guests)
    expect(guests).toHaveLength(5);

    // All guests should belong to User 1's event
    guests?.forEach((guest) => {
      expect(guest.event_id).toBe(user1EventId);
    });

    await supabase1.auth.signOut();
  });

  test("API level: User 2 has correct guest and table counts", async () => {
    const supabase2 = await createAuthenticatedClient(user2.email, user2.password);

    // Fetch User 2's data
    const { data: guests } = await supabase2.from("guests").select("*");
    const { data: tables } = await supabase2.from("tables").select("*");

    // Verify counts match what we created
    expect(guests).toHaveLength(10); // User 2 has 10 guests
    expect(tables).toHaveLength(2); // User 2 has 2 tables

    await supabase2.auth.signOut();
  });
});

test.describe.skip("RLS Example: Using Default Test User", () => {
  const testUser = getDefaultTestUser();
  let eventId: string;

  test.beforeEach(async () => {
    // Create test data before each test
    eventId = await setupTestData(testUser.email, testUser.password, {
      eventName: "My Event",
      guestCount: 8,
    });
  });

  test.afterEach(async () => {
    // Cleanup after each test
    await cleanupUserData(testUser.email, testUser.password);
  });

  test("should create and access event with authenticated client", async () => {
    const supabase = await createAuthenticatedClient(testUser.email, testUser.password);

    // Fetch the event we just created
    const { data: event, error } = await supabase.from("events").select("*").eq("id", eventId).single();

    expect(error).toBeNull();
    expect(event).toBeTruthy();
    expect(event?.name).toBe("My Event");

    // Fetch guests
    const { data: guests } = await supabase.from("guests").select("*").eq("event_id", eventId);

    expect(guests).toHaveLength(8);

    await supabase.auth.signOut();
  });
});
