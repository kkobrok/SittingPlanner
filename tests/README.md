# Testing Guide

This directory contains integration and unit tests for the SittingPlanner API.

## Setup

### 1. Install Test Dependencies

```bash
npm install -D vitest @vitest/ui @supabase/supabase-js
```

### 2. Add Test Scripts to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Set Up Test Environment

Create a `.env.test` file (or use existing `.env`):

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=your-anon-key-here
API_BASE_URL=http://localhost:3001
```

### 4. Start Supabase Locally

For local testing:

```bash
npx supabase start
```

This will start a local Supabase instance and provide you with the URL and keys.

## Running Tests

### Run All Tests

```bash
npm run test
```

### Watch Mode (Re-run on file changes)

```bash
npm run test:watch
```

### With UI

```bash
npm run test:ui
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── api/                    # API endpoint tests
│   └── events.test.ts      # Tests for /api/events
├── helpers/                # Test utilities
│   └── test-setup.ts       # Helper functions for test setup
├── setup.ts                # Global test setup
└── README.md               # This file
```

## Writing Tests

### Example Test

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, makeAuthenticatedRequest } from '../helpers/test-setup';

describe('My Feature', () => {
  let testUser;

  beforeAll(async () => {
    testUser = await createTestUser();
  });

  it('should work correctly', async () => {
    const response = await makeAuthenticatedRequest(
      '/api/my-endpoint',
      testUser.accessToken
    );

    expect(response.status).toBe(200);
  });
});
```

## Test Coverage Goals

- **Authentication**: All endpoints should verify authentication
- **Validation**: All input validation rules should be tested
- **Business Logic**: Core functionality should have tests
- **Error Handling**: All error scenarios should be covered
- **Edge Cases**: Boundary conditions and unusual inputs

## Current Test Status

### ✅ Implemented

- Test framework configuration (Vitest)
- Test helper utilities
- Test structure for GET /api/events

### ⏸️ To Implement

- Actual test execution (requires Supabase setup)
- Tests for other endpoints (POST, PATCH, DELETE)
- Performance tests
- Load tests

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start Supabase
        run: npx supabase start

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Failing with "Connection Refused"

Make sure the dev server is running:

```bash
npm run dev
```

### Tests Failing with "Supabase Error"

Ensure Supabase is running locally:

```bash
npx supabase status
```

### Tests Timing Out

Increase the timeout in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 20000, // 20 seconds
  },
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Readability**: Use descriptive test names
4. **Coverage**: Aim for >80% code coverage
5. **Speed**: Keep tests fast (< 5s per test)
6. **Reliability**: Tests should not be flaky

## Next Steps

1. Install vitest dependencies
2. Set up local Supabase
3. Run the test suite
4. Add tests for new endpoints as they're implemented
