# E2E Testing with Playwright

This directory contains end-to-end tests for the SittingPlanner application using Playwright.

## Test Structure

```
tests/e2e/
├── auth/                    # Authentication flow tests
│   └── login.spec.ts       # Login, logout, session tests
├── pages/                   # Page Object Models
│   ├── LoginPage.ts        # Login page interactions
│   └── NavigationComponent.ts  # Top navigation interactions
├── helpers/                 # Test utilities
│   └── test-user.ts        # User creation/cleanup helpers
├── global-setup.ts         # Global test setup (runs once)
└── README.md               # This file
```

## Running Tests

### Prerequisites

1. **Configure test environment**:
   ```bash
   # Copy the example environment file
   cp .env.test.example .env.test

   # Edit .env.test if needed (default values work for local testing)
   ```

2. **Start Supabase locally**:
   ```bash
   npx supabase start
   ```

3. **Start the development server** (in separate terminal):
   ```bash
   npm run dev
   ```

### Test Commands

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Run specific test file
npx playwright test auth/login.spec.ts

# Run tests matching a pattern
npx playwright test --grep "successful login"
```

## Page Object Model Pattern

We use the Page Object Model (POM) pattern to:
- **Encapsulate** page interactions in reusable classes
- **Maintain** tests easily when UI changes
- **Improve** test readability and reduce duplication

### Example Usage

```typescript
import { LoginPage } from '../pages/LoginPage';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password123');
  await expect(page).toHaveURL('/dashboard');
});
```

## Test User Management

### Default Test User

A default test user is automatically created during global setup:
- **Email**: `test@example.com`
- **Password**: `TestPassword123!`

Use this for most tests:

```typescript
import { getDefaultTestUser } from '../helpers/test-user';

const user = getDefaultTestUser();
await loginPage.login(user.email, user.password);
```

### Creating New Test Users

For tests that need unique users:

```typescript
import { createTestUser, deleteTestUser, generateTestEmail } from '../helpers/test-user';

// Create user
const email = generateTestEmail();
const newUser = await createTestUser(email, 'Password123!');

// Use in test...

// Cleanup after test
await deleteTestUser(newUser.id);
```

### Cleanup

```typescript
import { cleanupUserData } from '../helpers/test-user';

// Delete all user's events, guests, tables, etc.
// Uses authenticated client to respect RLS policies
const user = getDefaultTestUser();
await cleanupUserData(user.email, user.password);
```

### Setting Up Test Data

For tests that need pre-populated data:

```typescript
import { setupTestData, getDefaultTestUser } from '../helpers/test-user';

const user = getDefaultTestUser();

// Create an event with guests and tables
const eventId = await setupTestData(user.email, user.password, {
  eventName: 'Test Wedding',
  eventDate: '2025-06-15',
  guestCount: 20,  // Creates 20 test guests
  tableCount: 3,   // Creates 3 test tables
});

// Use eventId in your tests
await page.goto(`/events/${eventId}`);
```

## Data-TestId Selectors

All interactive elements have `data-testid` attributes for reliable selection:

### Navigation
- `top-nav` - Top navigation bar
- `app-logo` - Application logo link
- `user-menu-button` - User menu trigger
- `logout-button` - Logout button
- `sign-in-button` - Sign in link (unauthenticated)
- `sign-up-button` - Sign up link (unauthenticated)

### Login Page
- `login-form` - Login form
- `email-input` - Email input field
- `password-input` - Password input field
- `submit-button` - Submit button
- `login-error-message` - Error message element
- `forgot-password-link` - Forgot password link

## Row-Level Security (RLS) Testing

**Important**: Tests use authenticated Supabase clients (not service role key) to ensure Row-Level Security policies are properly tested.

### Why This Matters

1. **Realistic Testing**: Tests interact with the database the same way the application does
2. **Security Validation**: Ensures users can only access their own data
3. **Policy Verification**: Confirms RLS policies are correctly configured
4. **Data Isolation**: Prevents test data from leaking between users

### How It Works

```typescript
// ❌ DON'T: Use service role key (bypasses RLS)
const supabase = createClient(url, serviceKey);

// ✅ DO: Use authenticated client (respects RLS)
const supabase = await createAuthenticatedClient(email, password);
```

All helper functions (`cleanupUserData`, `setupTestData`) use authenticated clients by default.

## Test Categories

### 1. Authentication Tests (`auth/login.spec.ts`)
- ✅ Successful login flow
- ✅ Invalid credentials handling
- ✅ Form validation (email format, required fields)
- ✅ Session persistence
- ✅ Logout functionality
- ✅ Navigation between auth pages
- ✅ Performance (login within 5 seconds)

### 2. Event Management Tests (`events/event-management.spec.ts`)
- ✅ Viewing events dashboard
- ✅ Creating new events
- ✅ Editing event details
- ✅ Deleting events
- ✅ Data isolation (RLS testing)
- ✅ Event persistence

### 3. Future Test Suites
- **Guest Management**: Add, edit, remove guests
- **Table Management**: Create table configurations
- **Seating Plan**: Drag-and-drop assignments, AI generation
- **Relationships**: Define guest relationships and constraints
- **Export**: PDF and CSV export functionality

## Environment Variables

Tests use environment variables from `.env.test` file (loaded automatically by Playwright):

```env
# Supabase Configuration (Local)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz

# Application Base URL
BASE_URL=http://localhost:4321

# OpenRouter API Key (for AI tests)
OPENROUTER_API_KEY=test-key-or-mock

# Test User Defaults
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

**Important**: Create `.env.test` by copying `.env.test.example` before running tests.

```bash
cp .env.test.example .env.test
```

## CI/CD Integration

For continuous integration, tests will:
1. Start Supabase in a Docker container
2. Run migrations
3. Start the application server
4. Execute Playwright tests
5. Upload test reports as artifacts

Example GitHub Actions workflow:

```yaml
- name: Run E2E tests
  run: |
    npx supabase start
    npm run dev &
    sleep 10
    npm run test:e2e
```

## Debugging Tips

### 1. Use UI Mode
```bash
npm run test:e2e:ui
```
Interactive time-travel debugging with DOM snapshots.

### 2. Use Debug Mode
```bash
npm run test:e2e:debug
```
Step through tests with Playwright Inspector.

### 3. Add Trace on Failure
Already configured in `playwright.config.ts`:
```typescript
trace: 'on-first-retry'
```

### 4. Screenshots and Videos
Automatic on failure:
```typescript
screenshot: 'only-on-failure',
video: 'retain-on-failure'
```

### 5. Console Logging
```typescript
page.on('console', msg => console.log('Browser log:', msg.text()));
```

## Best Practices

1. **Use Page Object Models** - Encapsulate page interactions
2. **Use data-testid selectors** - More reliable than CSS/text selectors
3. **Cleanup test data** - Delete users/data after tests
4. **Independent tests** - Each test should run independently
5. **Meaningful names** - Describe what the test validates
6. **AAA Pattern** - Arrange, Act, Assert structure
7. **Wait for navigation** - Use `waitForURL()` instead of timeouts
8. **Avoid hardcoded waits** - Use Playwright's auto-waiting

## Troubleshooting

### Tests fail with "page not found"
- Ensure dev server is running: `npm run dev`
- Check `BASE_URL` in playwright.config.ts

### Tests fail with "Supabase connection error"
- Start Supabase: `npx supabase start`
- Verify connection: `npx supabase status`

### "Test user already exists" error
- This is normal - global setup checks for existing user
- To reset: `npx supabase db reset`

### Flaky tests
- Check for race conditions
- Use proper wait strategies (`waitForURL`, `waitFor`)
- Ensure cleanup runs in `afterEach`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
