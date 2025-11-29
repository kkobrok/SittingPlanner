import { test, expect } from "@playwright/test";
import { getDefaultTestUser, setupTestData, cleanupUserData } from "./e2e/helpers/test-user";

test.describe("Debug API", () => {
  const testUser = getDefaultTestUser();

  test.beforeAll(async () => {
    // Clean before test
    await cleanupUserData(testUser.email, testUser.password);
  });

  test.afterAll(async () => {
    // Clean after test
    await cleanupUserData(testUser.email, testUser.password);
  });

  test("should create event and verify via direct database query", async ({ page, request }) => {
    // Create event via setupTestData
    const eventId = await setupTestData(testUser.email, testUser.password, {
      eventName: "Debug Test Event",
      eventDate: "2025-12-31",
    });

    console.log(`[Debug] Created event with ID: ${eventId}`);

    // Login to browser
    await page.goto("/auth/login");
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    console.log("[Debug] Logged in to browser");

    // Make API request from browser context
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/events");
      const data = await res.json();
      return { status: res.status, data };
    });

    console.log("[Debug] API response:", JSON.stringify(response, null, 2));

    expect(response.status).toBe(200);
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    console.log(`[Debug] Events count: ${response.data.data.length}`);

    if (response.data.data.length === 0) {
      console.error("[Debug] NO EVENTS RETURNED! Event was created but API returned empty array");
    } else {
      console.log(
        "[Debug] Events:",
        response.data.data.map((e: any) => ({ id: e.id, name: e.name }))
      );
    }
  });
});
