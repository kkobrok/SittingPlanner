import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

/**
 * Load test environment variables from .env.test
 * This allows separate configuration for E2E tests vs development
 */
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright E2E Testing Configuration
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",

  /* Global setup script */
  globalSetup: "./tests/e2e/global-setup.ts",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [["html"], ["list"], ["json", { outputFile: "test-results/results.json" }]],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL || "http://localhost:54321",
      SUPABASE_KEY: process.env.SUPABASE_KEY || "test-key",
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || "test-service-key",
      PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "http://localhost:54321",
      PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "test-key",
      // Disable auth in test environments to avoid needing real Supabase credentials
      DISABLE_AUTH: process.env.DISABLE_AUTH || "true",
      // E2E test user credentials
      E2E_USERNAME: process.env.E2E_USERNAME || "e2e@e2e.pl",
      E2E_PASSWORD: process.env.E2E_PASSWORD || "pomidor123",
      E2E_USERNAME_ID: process.env.E2E_USERNAME_ID || "11ba4a5c-aa20-4777-ae3d-f8efc8eaef99",
    },
  },
});
