import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    sourcemap: true,
  },
  test: {
    // Test environment
    environment: "node",

    // Enable globals (describe, it, expect, beforeAll, etc. without imports)
    globals: true,

    // Global test setup and teardown
    setupFiles: ["./tests/setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".astro/**",
        "tests/**",
        "**/*.config.*",
        "**/types.ts",
        "**/database.types.ts",
        "**/*.astro",
      ],
    },

    // Test timeouts
    testTimeout: 10000, // 10 seconds for integration tests
    hookTimeout: 10000,

    // Test file patterns
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],

    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".astro",
      "tests/e2e/**", // Exclude Playwright e2e tests
      "tests/debug-api.test.ts", // Exclude Playwright tests in tests root
    ],
  },
});
