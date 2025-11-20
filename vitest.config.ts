import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Global test setup and teardown
    setupFiles: ["./tests/setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".astro/**",
        "tests/**",
        "**/*.config.*",
        "**/types.ts",
        "**/database.types.ts",
      ],
    },

    // Test timeouts
    testTimeout: 10000, // 10 seconds for integration tests
    hookTimeout: 10000,

    // Enable globals (describe, it, expect without imports)
    globals: true,

    // Test file patterns
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "dist", ".astro"],
  },
});
