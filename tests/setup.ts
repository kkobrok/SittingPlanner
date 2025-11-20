/**
 * Global Test Setup
 *
 * This file runs before all tests.
 * Use it to set up global test environment, load environment variables, etc.
 */

import { beforeAll, afterAll } from "vitest";

// Load environment variables for testing
// You can use dotenv or similar to load test-specific .env files
// import { config } from 'dotenv';
// config({ path: '.env.test' });

// Ensure required environment variables are set
beforeAll(() => {
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_KEY"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(
        `Warning: ${envVar} not set. Using default test values. ` + `For full integration tests, set this in .env.test`
      );
    }
  }
});

// Cleanup after all tests
afterAll(() => {
  // Perform any global cleanup if needed
  console.log("All tests completed");
});

// Extend vitest matchers if needed
// expect.extend({
//   customMatcher(received, expected) {
//     // Custom matcher logic
//   },
// });
