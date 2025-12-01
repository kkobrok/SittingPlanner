/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { chromium, type FullConfig } from "@playwright/test";
import { createTestUser, getDefaultTestUser, createAdminClient } from "./helpers/test-user";

/**
 * Global setup for Playwright E2E tests
 *
 * Runs once before all tests to:
 * - Verify Supabase connection
 * - Create default test user
 * - Warmup the application server
 */
async function globalSetup(config: FullConfig) {
  console.log("\n🔧 Running global test setup...\n");

  // 1. Verify Supabase connection
  console.log("✓ Verifying Supabase connection...");
  const supabase = createAdminClient();
  const { error: healthError } = await supabase.from("events").select("count").limit(1);

  if (healthError) {
    console.error("❌ Supabase connection failed:", healthError.message);
    throw new Error("Supabase is not accessible. Make sure the database is running.");
  }
  console.log("✓ Supabase connection verified\n");

  // 2. Create/verify default test user
  console.log("✓ Setting up default test user...");
  const defaultUser = getDefaultTestUser();

  try {
    // Try to create the user (will fail if already exists)
    const user = await createTestUser(defaultUser.email, defaultUser.password);
    console.log(`✓ Default test user created: ${user.email}\n`);
  } catch (error: any) {
    // User likely already exists, which is fine
    if (error.message.includes("already registered")) {
      console.log(`✓ Default test user already exists: ${defaultUser.email}\n`);
    } else {
      console.warn(`⚠️  Issue with test user setup: ${error.message}\n`);
    }
  }

  // 3. Warmup application server
  console.log("✓ Warming up application server...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";
    await page.goto(baseURL, { waitUntil: "networkidle", timeout: 30000 });
    console.log(`✓ Application server responding at ${baseURL}\n`);
  } catch (error: any) {
    console.error("❌ Application server not responding:", error.message);
    throw new Error("Application server is not running. Start it with: npm run dev");
  } finally {
    await browser.close();
  }

  console.log("✅ Global setup completed successfully!\n");
}

export default globalSetup;
