/**
 * Global Test Setup
 *
 * This file runs before all tests.
 * Use it to set up global test environment, load environment variables, etc.
 */

// Load environment variables for testing (if needed)
// import { config } from 'dotenv';
// config({ path: '.env.test' });

// Set default test environment variables if not already set
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
}

if (!process.env.SUPABASE_KEY) {
  process.env.SUPABASE_KEY = "test-key";
}

if (!process.env.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
}

// Extend vitest matchers if needed
// import { expect } from 'vitest';
// expect.extend({
//   customMatcher(received, expected) {
//     // Custom matcher logic
//   },
// });
