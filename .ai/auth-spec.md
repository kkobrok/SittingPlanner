# Authentication System Architecture Specification

## Document Overview

**Project:** SittingPlanner (EasyWedding MVP)
**Version:** 1.1
**Date:** 2025-01-25
**Last Updated:** 2025-01-25 (PRD Alignment Verification)
**Purpose:** Technical specification for user registration, login, logout, and password recovery functionality
**Related Requirements:** US-003 (Secure Access and Authentication), US-002 (Guest and Table Management - authentication dependency)

---

## 0. PRD ALIGNMENT VERIFICATION

This section verifies that the authentication specification fully satisfies all requirements from the Product Requirements Document (PRD).

### 0.1 User Story Coverage

#### US-001: Seating Plan Creation
**Status:** ✅ Fully Compatible

**Dependencies on Authentication:**
- All seating plan pages require authentication (Section 1.1.2)
- User context available for creating/editing plans (Section 2.4.2)
- RLS policies ensure user can only access their own plans (Section 3.7.1)

**Acceptance Criteria Verification:**
- ✅ "User can create a new seating plan" - Protected by auth, user context provided
- ✅ "User can assign guests to tables" - Protected by auth, RLS enforced
- ✅ "User can update seating assignments" - Protected by auth, user ownership validated
- ✅ "User can delete a seating plan" - Protected by auth, RLS enforced
- ✅ "User can view a summary" - Protected by auth, filtered to user's data

#### US-002: Guest and Table Management
**Status:** ✅ Fully Compatible

**Dependencies on Authentication:**
- Explicitly states: "User cannot manage guests or tables without logging in"
- Guest and table pages protected (Section 1.1.2)
- Guest import requires authentication (Section 5.2)

**Acceptance Criteria Verification:**
- ✅ "User can add, edit, and remove guests" - Protected pages, Section 1.1.2
- ✅ "User can add, edit, and remove tables" - Protected pages, Section 1.1.2
- ✅ "User can import guest lists from a file" - Auth required, Section 5.2
- ✅ "User can view guests and tables in a dashboard" - Dashboard protected, Section 1.1.2
- ✅ "User cannot manage guests or tables without logging in" - Explicitly enforced, Section 1.1.2

#### US-003: Secure Access and Authentication
**Status:** ✅ Fully Implemented

**Acceptance Criteria Mapping to Specification:**

| PRD Acceptance Criterion | Specification Section | Implementation Status |
|--------------------------|----------------------|----------------------|
| "Registration and login are available on dedicated pages" | Section 1.1.1 | ✅ `/auth/register` and `/auth/login` pages |
| "Login requires email and password" | Section 1.3.1, 2.1.1 | ✅ Email + password fields defined |
| "Registration requires email, password, and password confirmation" | Section 1.1.1 | ✅ All three fields included in form |
| "User can log in and log out using buttons in the top navigation" | Section 1.2.1 | ✅ "Sign In" button (unauthenticated), "Sign Out" button (authenticated) |
| "No external login providers (e.g., Google, GitHub) are used" | Section 3.2.2 | ✅ Explicitly confirmed: "Email/password only" |
| "Password recovery is available" | Section 3.5 | ✅ Complete flow: forgot-password → email → reset-password |
| "User cannot access event management features without logging in" | Section 1.1.2, 2.4.2 | ✅ All event pages have auth checks with redirect |

### 0.2 Identified Clarifications

**Clarification 1: Login Button Location**
- **PRD Statement:** "User can log in and log out using buttons in the top navigation"
- **Interpretation:** "Sign In" button in TopNav navigates to `/auth/login` page (not inline form)
- **Rationale:** Maintains clean navigation UX, follows standard web patterns
- **Implementation:** Section 1.2.1 (updated)

**Clarification 2: Guest Import Authentication**
- **PRD Statement:** "User can import guest lists from a file" (US-002)
- **Implicit Requirement:** Import must respect authentication (per "User cannot manage guests or tables without logging in")
- **Implementation:** Section 5.2 explicitly addresses authentication for file imports

### 0.3 Conflict Resolution

**No conflicts identified.** All PRD requirements can be implemented as specified in this document.

### 0.4 Redundancy Check

**No redundant specifications.** This document focuses exclusively on authentication architecture while referencing (not duplicating) existing feature specifications.

---

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Page Structure and Routing

The authentication system comprises dedicated pages for each authentication flow, integrated with Astro's server-side rendering capabilities.

#### 1.1.1 Authentication Pages (New/Extended)

**Location:** `src/pages/auth/`

##### `/auth/login` (Existing - Requires Enhancement)
- **Current State:** Basic login page exists at `src/pages/auth/login.astro`
- **Purpose:** User authentication entry point
- **Mode:** Server-rendered (`prerender: false`)
- **Layout:** Uses `AppShell` layout (includes TopNav)
- **Enhancements Needed:**
  - Add "Forgot Password?" link routing to `/auth/forgot-password`
  - Add "Don't have an account? Register" link routing to `/auth/register`
  - Enhance error messaging for better UX
  - Add client-side password visibility toggle
  - Add loading state during form submission

##### `/auth/register` (New)
- **Purpose:** New user registration
- **Mode:** Server-rendered (`prerender: false`)
- **Layout:** Uses `AppShell` layout (includes TopNav)
- **Components:**
  - Email input field (with validation)
  - Password input field (with strength indicator)
  - Password confirmation field (with real-time matching validation)
  - Terms of service acceptance checkbox
  - "Already have an account? Login" link
  - Submit button with loading state
  - Error/success message display area

##### `/auth/forgot-password` (New)
- **Purpose:** Initiate password recovery process
- **Mode:** Server-rendered (`prerender: false`)
- **Layout:** Uses `AppShell` layout (includes TopNav)
- **Components:**
  - Email input field
  - "Send Reset Link" submit button
  - Success message confirming email sent (generic for security)
  - "Back to Login" link
  - Instructions explaining the process

##### `/auth/reset-password` (New)
- **Purpose:** Complete password reset after email verification
- **Mode:** Server-rendered (`prerender: false`)
- **Layout:** Uses `AppShell` layout (includes TopNav)
- **Components:**
  - New password input field (with strength indicator)
  - Confirm new password field
  - Submit button
  - Error/success messaging
  - Auto-redirect to login on success
- **URL Parameters:** Expects Supabase auth token from email link
- **Server-Side Logic:** Validates token presence on page load

##### `/` (Landing Page - Enhancement)
- **Current:** Uses `Layout` wrapper, displays `Welcome` component
- **Enhancement:** Check authentication status in frontmatter
  - If authenticated: Redirect to `/dashboard`
  - If not authenticated: Show welcome/marketing content with CTA buttons
  - Add "Sign In" and "Sign Up" buttons in hero section

#### 1.1.2 Protected Pages (Enhancement)

All existing application pages require authentication enforcement:

**Pages requiring protection:**
- `/dashboard` - Event listing page
- `/events/index` - Alternative events listing
- `/events/create` - Event creation form
- `/events/[eventId]/guests` - Guest management
- `/events/[eventId]/tables` - Table management
- `/events/[eventId]/plan` - Seating plan editor
- `/account` - User account settings
- `/templates` - Template management

**Protection Strategy:**
1. Add authentication check in page frontmatter (server-side)
2. Use `authenticate()` helper from `src/middleware/auth.ts`
3. Redirect to `/auth/login` if not authenticated
4. Store original URL in session/cookie for post-login redirect

### 1.2 Component Architecture

#### 1.2.1 Layout Components

##### `AppShell.astro` (Existing - No Changes)
- **Location:** `src/layouts/AppShell.astro`
- **Current Functionality:**
  - Wraps pages with `Layout` base
  - Includes `TopNav` component
  - Provides consistent page structure
- **No changes required** - already suitable for both auth and non-auth pages

##### `TopNav.astro` (Existing - Requires Enhancement)
- **Location:** `src/components/TopNav.astro`
- **Current State:** Shows user menu with logout functionality
- **Enhancement Strategy:**
  - Add conditional rendering based on authentication state
  - When authenticated: Show existing user menu
  - When not authenticated: Show "Sign In" and "Sign Up" buttons
  - Fetch user email from Supabase session to display in dropdown
  - Replace hardcoded "user@example.com" with actual user email

**Enhanced TopNav Structure:**
```
TopNav Component
├── Authenticated State
│   ├── Logo/Brand (links to /dashboard)
│   ├── Dashboard link
│   └── User Menu Dropdown
│       ├── User email display
│       ├── Account Settings link
│       └── Sign Out button (logs out and redirects to /auth/login)
└── Unauthenticated State
    ├── Logo/Brand (links to /)
    ├── Sign In button (links to /auth/login) ← Fulfills US-003 "log in button in top navigation"
    └── Sign Up button (links to /auth/register)
```

**PRD Requirement Clarification:**
- US-003 states: "User can log in and log out using buttons in the top navigation"
- **Login:** "Sign In" button in unauthenticated TopNav navigates to `/auth/login` page
- **Logout:** "Sign Out" button in authenticated TopNav triggers logout and redirect
- This approach maintains clean navigation UX without inline login forms

#### 1.2.2 Form Components (New)

##### Authentication Form Pattern
All authentication forms follow a consistent architecture:

**React vs Astro Decision:**
- **Forms:** Plain HTML forms with Astro inline scripts (no React)
- **Reason:** Forms are simple, don't require complex state management
- **Benefits:** Reduced JavaScript bundle, progressive enhancement
- **Pattern:** Existing login page pattern (HTML form + inline `<script>`)

**Common Form Features:**
1. **Client-Side Script Block** (`<script>` tag in Astro page)
   - Form submission handler
   - Prevents default form submission
   - Calls appropriate API endpoint
   - Handles success/error responses
   - Manages loading states
   - Displays error messages
   - Redirects on success

2. **Error Display Element**
   - Hidden by default
   - Shows validation or API errors
   - Accessible (aria-live="polite")
   - Styled consistently (red text)

3. **Loading States**
   - Disable submit button during API call
   - Show loading indicator/spinner
   - Prevent duplicate submissions

##### Password Strength Indicator Component
- **Implementation:** Client-side vanilla JavaScript
- **Location:** Inline in register and reset-password pages
- **Features:**
  - Real-time strength calculation
  - Visual indicator (weak/medium/strong)
  - Color-coded feedback
  - Minimum requirements display

##### Password Visibility Toggle
- **Implementation:** Client-side vanilla JavaScript
- **Location:** Inline in all password input forms
- **Features:**
  - Eye icon button
  - Toggles between text/password input type
  - Accessible (aria-label)

#### 1.2.3 Navigation Flow Components

##### Post-Login Redirect Handler
- **Type:** Server-side logic in API routes
- **Mechanism:** Cookie-based original URL storage
- **Flow:**
  1. User attempts to access protected page
  2. Server stores requested URL in cookie
  3. Redirects to login
  4. After successful login, reads cookie
  5. Redirects to original URL or defaults to `/dashboard`

### 1.3 Validation Architecture

#### 1.3.1 Client-Side Validation

**Location:** Inline `<script>` tags in Astro pages

**Registration Page:**
- Email format validation (HTML5 + custom)
- Password length minimum (6 characters)
- Password match validation (password vs confirmation)
- Real-time feedback on password confirmation field
- Terms acceptance checkbox required

**Login Page:**
- Email format validation (HTML5)
- Password required (no specific rules on login)

**Forgot Password Page:**
- Email format validation (HTML5)

**Reset Password Page:**
- Password length minimum (6 characters)
- Password match validation
- Password strength feedback

#### 1.3.2 Server-Side Validation

**Location:** `src/validators/auth.validator.ts` (Existing)

**Validation Schemas (Zod):**

```typescript
RegisterRequestSchema:
- email: string, email format, max 255 chars, lowercase, trimmed
- password: string, min 6 chars, max 72 chars (bcrypt limit)

LoginRequestSchema:
- email: string, email format, lowercase, trimmed
- password: string, required

PasswordResetRequestSchema:
- email: string, email format, lowercase, trimmed
```

**Validation Flow:**
1. API route receives request body
2. Schema validates and transforms data
3. Validation errors return 400 with detailed field errors
4. Valid data proceeds to service layer

#### 1.3.3 Error Messages

**Client-Side Messages:**
- "Email is required"
- "Please enter a valid email address"
- "Password must be at least 6 characters"
- "Passwords do not match"
- "Please accept the terms of service"
- "An error occurred. Please try again."

**Server-Side Error Codes:**
- `invalid_credentials` - Login failure (401)
- `email_already_exists` - Registration conflict (409)
- `validation_error` - Input validation failure (400)
- Generic error messages for security (don't reveal user existence)

### 1.4 User Experience Scenarios

#### Scenario 1: New User Registration
1. User navigates to `/` (landing page)
2. Clicks "Sign Up" button
3. Redirects to `/auth/register`
4. Fills email, password, password confirmation
5. Accepts terms of service
6. Clicks "Register" button
7. Client validates inputs
8. Submits to `POST /api/auth/register`
9. On success: Creates session, redirects to `/dashboard`
10. On error: Displays error message inline

#### Scenario 2: Existing User Login
1. User navigates to `/auth/login` or clicks "Sign In"
2. Enters email and password
3. Clicks "Login" button
4. Client validates inputs
5. Submits to `POST /api/auth/login`
6. On success: Creates session, redirects to original URL or `/dashboard`
7. On error: Displays "Invalid email or password" message

#### Scenario 3: Password Recovery
1. User clicks "Forgot Password?" on login page
2. Redirects to `/auth/forgot-password`
3. Enters email address
4. Clicks "Send Reset Link"
5. Submits to `POST /api/auth/forgot-password`
6. Shows success message (always, for security)
7. User receives email with reset link
8. Clicks link in email (contains token)
9. Redirects to `/auth/reset-password?token=...`
10. Enters new password twice
11. Submits to `POST /api/auth/reset-password`
12. On success: Redirects to `/auth/login` with success message
13. On error: Displays error message

#### Scenario 4: Logout
1. Authenticated user clicks user menu in TopNav
2. Clicks "Sign Out" button
3. JavaScript calls `POST /api/auth/logout`
4. Server invalidates session
5. Redirects to `/auth/login`

#### Scenario 5: Protected Page Access (Not Authenticated)
1. Unauthenticated user tries to access `/dashboard`
2. Server checks authentication in page frontmatter
3. Stores requested URL (`/dashboard`) in cookie
4. Redirects to `/auth/login`
5. After successful login, redirects back to `/dashboard`

---

## 2. BACKEND LOGIC

### 2.1 API Endpoints

#### 2.1.1 Existing Endpoints

##### `POST /api/auth/login` (Existing)
- **Location:** `src/pages/api/auth/login.ts`
- **Purpose:** Authenticate user and create session
- **Request Body:**
  ```typescript
  {
    email: string;      // Valid email format
    password: string;   // User password
  }
  ```
- **Validation:** `LoginRequestSchema` (Zod)
- **Response (200):**
  ```typescript
  {
    user: {
      id: string;
      email: string;
    },
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: string;  // ISO 8601 timestamp
    }
  }
  ```
- **Error Responses:**
  - 400: Validation error
  - 401: Invalid credentials
  - 500: Internal server error
- **Session Handling:** Tokens returned in response body (client stores)
- **No changes required** - current implementation satisfactory

##### `POST /api/auth/register` (Existing)
- **Location:** `src/pages/api/auth/register.ts`
- **Purpose:** Create new user account
- **Request Body:**
  ```typescript
  {
    email: string;      // Valid email, max 255 chars
    password: string;   // Min 6 chars, max 72 chars
  }
  ```
- **Validation:** `RegisterRequestSchema` (Zod)
- **Response (201):**
  ```typescript
  {
    user: {
      id: string;
      email: string;
      created_at: string;
    },
    session: {
      access_token: string;
      refresh_token: string;
      expires_at: string;
    }
  }
  ```
- **Error Responses:**
  - 400: Validation error
  - 409: Email already exists
  - 500: Internal server error
- **No changes required** - current implementation satisfactory

##### `POST /api/auth/logout` (Existing)
- **Location:** `src/pages/api/auth/logout.ts`
- **Purpose:** Invalidate user session
- **Request Body:** None
- **Authentication:** Requires valid session (reads from Supabase client)
- **Response (200):**
  ```typescript
  {
    message: "Successfully logged out"
  }
  ```
- **Error Responses:**
  - 500: Logout failed
- **Implementation:** Calls `supabase.auth.signOut()`
- **No changes required** - current implementation satisfactory

#### 2.1.2 New Endpoints Required

##### `POST /api/auth/forgot-password` (New)
- **Location:** `src/pages/api/auth/forgot-password.ts` (to be created)
- **Purpose:** Initiate password reset flow
- **Request Body:**
  ```typescript
  {
    email: string;  // Valid email format
  }
  ```
- **Validation:** `PasswordResetRequestSchema` (Zod)
- **Response (200):**
  ```typescript
  {
    message: "Password reset email sent"
  }
  ```
  - **Note:** Always return success for security (don't reveal if email exists)
- **Error Responses:**
  - 400: Validation error
  - 500: Internal server error
- **Implementation:**
  - Call `authService.requestPasswordReset()`
  - Service calls Supabase `resetPasswordForEmail()`
  - Supabase sends email with magic link
  - Redirect URL: `${APP_URL}/auth/reset-password`

##### `POST /api/auth/reset-password` (New)
- **Location:** `src/pages/api/auth/reset-password.ts` (to be created)
- **Purpose:** Complete password reset with new password
- **Request Body:**
  ```typescript
  {
    password: string;  // New password, min 6 chars
  }
  ```
- **Authentication:** Requires valid reset token from email link
- **Validation:** Password validation (min 6 chars)
- **Response (200):**
  ```typescript
  {
    message: "Password updated successfully"
  }
  ```
- **Error Responses:**
  - 400: Validation error
  - 401: Invalid or expired token
  - 500: Internal server error
- **Implementation:**
  - Extract token from Supabase session context
  - Call Supabase `updateUser({ password })`
  - Supabase validates token and updates password

##### `GET /api/auth/session` (New - Optional Enhancement)
- **Location:** `src/pages/api/auth/session.ts` (to be created)
- **Purpose:** Validate current session and return user info
- **Authentication:** Requires valid session token
- **Response (200):**
  ```typescript
  {
    user: {
      id: string;
      email: string;
    },
    authenticated: true
  }
  ```
- **Response (401):**
  ```typescript
  {
    authenticated: false
  }
  ```
- **Use Case:** Client-side authentication state checking

### 2.2 Service Layer

#### 2.2.1 Existing Service: `AuthService`

**Location:** `src/services/auth.service.ts`

**Current Methods:**
1. `register(data: RegisterRequestDto): Promise<AuthResponseDto>`
2. `login(data: LoginRequestDto): Promise<AuthResponseDto>`
3. `logout(): Promise<LogoutResponseDto>`
4. `requestPasswordReset(data: PasswordResetRequestDto): Promise<PasswordResetResponseDto>`
5. `getCurrentUser(): Promise<UserDto | null>`

**Service Architecture:**
- Dependency injection: Takes `SupabaseClient<Database>` in constructor
- Error handling: Throws typed errors (e.g., "INVALID_CREDENTIALS", "EMAIL_ALREADY_EXISTS")
- Response formatting: Transforms Supabase responses to application DTOs
- Security: Generic error messages (doesn't reveal user existence)

**New Method Required:**

```typescript
async resetPassword(newPassword: string): Promise<PasswordResetResponseDto>
```
- Calls `supabase.auth.updateUser({ password: newPassword })`
- Validates token implicitly through Supabase session
- Returns success message

### 2.3 Data Models and Types

#### 2.3.1 Existing Type Definitions

**Location:** `src/types.ts`

**Authentication DTOs (Already Defined):**
- `RegisterRequestDto` - Registration input
- `LoginRequestDto` - Login input
- `PasswordResetRequestDto` - Password reset request input
- `UserDto` - User information in responses
- `SessionDto` - Session token information
- `AuthResponseDto` - Combined user + session response
- `LogoutResponseDto` - Logout success response
- `PasswordResetResponseDto` - Password reset success response

**No new types required** - existing types are comprehensive

#### 2.3.2 Database Schema

**Table:** `auth.users` (Supabase managed)

Supabase Auth handles user storage in the `auth` schema. Application doesn't directly manage this table.

**Fields Used:**
- `id` (UUID) - Primary key, generated by Supabase
- `email` (string) - Unique, user email address
- `encrypted_password` (string) - Hashed password, managed by Supabase
- `created_at` (timestamp) - User creation time
- `updated_at` (timestamp) - Last update time
- `email_confirmed_at` (timestamp) - Email verification time
- `confirmation_token` (string) - Email verification token
- `recovery_token` (string) - Password reset token

**Foreign Key Relationships:**
- `events.user_id` → `auth.users.id` (existing)
- All user data tied to Supabase auth user ID

### 2.4 Middleware and Authentication Context

#### 2.4.1 Existing Middleware

##### Global Middleware
**Location:** `src/middleware/index.ts`

**Current Implementation:**
```typescript
export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

**Functionality:**
- Injects Supabase client into `context.locals`
- Available to all API routes and pages
- No authentication enforcement at global level

**No changes required** - client injection sufficient

##### Authentication Helper
**Location:** `src/middleware/auth.ts`

**Current Implementation:**
- `authenticate(supabase)` - Validates user session
- `isAuthBypass()` - Checks if development mode auth bypass enabled
- `getAuthMode()` - Returns "development" or "production"

**Features:**
- Development mode support (`DISABLE_AUTH=true`)
- Returns mock user in dev mode
- Production mode validates actual Supabase session
- Returns `{ user, error }` result object

**Enhancement Required:**
Add server-side redirect helper for page protection:

```typescript
async function requireAuth(
  supabase: SupabaseClient,
  redirect?: AstroGlobal['redirect']
): Promise<AuthUser>
```
- Calls `authenticate(supabase)`
- If not authenticated and redirect provided: Redirects to `/auth/login`
- If authenticated: Returns user
- Throws error if not authenticated and no redirect

#### 2.4.2 Page-Level Authentication

**Implementation Pattern:**

```typescript
// In protected Astro page frontmatter
---
import { authenticate } from '../middleware/auth';

export const prerender = false;

const { user, error } = await authenticate(Astro.locals.supabase);

if (error || !user) {
  // Store intended destination for post-login redirect
  Astro.cookies.set('redirect_after_login', Astro.url.pathname);
  return Astro.redirect('/auth/login');
}

// Page now has access to authenticated user
const userId = user.id;
const userEmail = user.email;
---
```

**Pages Requiring This Pattern:**
- All pages listed in section 1.1.2 (Protected Pages)

### 2.5 Session Management

#### 2.5.1 Session Storage Strategy

**Client-Side Storage:**
- Supabase handles session persistence automatically
- Tokens stored in `localStorage` by Supabase client
- Automatic token refresh before expiration
- Client-side Supabase SDK manages session lifecycle

**Server-Side Session Validation:**
- Each request extracts token from Authorization header or cookie
- Supabase validates token and returns user
- No custom session storage required

#### 2.5.2 Token Lifecycle

**Access Token:**
- Short-lived (default: 1 hour)
- Sent in API requests
- Validated on server for protected routes

**Refresh Token:**
- Long-lived (default: 30 days)
- Used to obtain new access tokens
- Automatically refreshed by Supabase client

**Session Expiration Handling:**
- Client SDK automatically refreshes before expiration
- If refresh fails: Session expires, user redirected to login
- Server returns 401 for expired tokens

### 2.6 Error Handling Strategy

#### 2.6.1 API Route Error Handling Pattern

**Structure (Existing Pattern):**
1. Try-catch block wraps all logic
2. Zod validation errors caught and formatted
3. Service-layer errors caught and categorized
4. Unexpected errors return 500 with request ID
5. All errors logged with appropriate level

**Error Response Format:**
```typescript
{
  error: string;        // Error type (e.g., "Validation Error")
  message: string;      // Human-readable message
  code?: string;        // Machine-readable code (e.g., "invalid_credentials")
  details?: array;      // Validation errors with field details
  request_id?: string;  // Unique request identifier for debugging
}
```

#### 2.6.2 Client-Side Error Handling

**Pattern:**
1. API request wrapped in try-catch
2. Check response status
3. Parse error JSON if not OK
4. Display error message in UI
5. Provide recovery options (retry, navigate, etc.)

**User-Facing Messages:**
- Generic for security: "Invalid email or password" (not "Email not found")
- Specific for validation: Field-level error messages
- Actionable: Include next steps or suggestions

### 2.7 Server-Side Rendering Updates

#### 2.7.1 Astro Configuration

**Location:** `astro.config.mjs`

**Current Configuration:**
```javascript
export default defineConfig({
  output: "server",              // SSR mode enabled
  adapter: node({ mode: "standalone" }),
  server: { port: 3000 }
});
```

**No changes required** - already configured for SSR

#### 2.7.2 Page Rendering Strategy

**Authentication Pages:**
- `prerender: false` - Server-side render on each request
- Check authentication status in frontmatter
- Conditional rendering based on auth state
- Server-side redirects for auth logic

**Protected Pages:**
- `prerender: false` - Server-side render with auth check
- Fetch data server-side with user context
- Pass user ID to data fetching functions

**Public Pages:**
- Can use `prerender: true` if purely static
- Or `prerender: false` with auth-based conditional content

---

## 3. AUTHENTICATION SYSTEM

### 3.1 Supabase Auth Integration

#### 3.1.1 Supabase Client Configuration

**Location:** `src/db/supabase.client.ts`

**Current Implementation:**
```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
```

**Configuration:**
- Uses anon (public) key for client creation
- Anon key has restricted permissions (RLS enforced)
- Client injected into requests via middleware
- Single shared instance across application

**Environment Variables Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public API key

**No changes required** - existing configuration sufficient

#### 3.1.2 Supabase Auth Methods Used

**Registration:**
```typescript
supabase.auth.signUp({
  email: string,
  password: string
})
```
- Creates user in `auth.users` table
- Sends confirmation email (if enabled)
- Returns user and session objects

**Login:**
```typescript
supabase.auth.signInWithPassword({
  email: string,
  password: string
})
```
- Validates credentials
- Returns user and session objects
- Session tokens stored by client

**Logout:**
```typescript
supabase.auth.signOut()
```
- Invalidates current session
- Removes tokens from storage

**Password Reset Request:**
```typescript
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: string  // URL to redirect after clicking email link
})
```
- Sends password reset email
- Email contains magic link with reset token

**Password Update:**
```typescript
supabase.auth.updateUser({
  password: string
})
```
- Updates user password
- Requires valid session (from reset link or authenticated user)

**Get Current User:**
```typescript
supabase.auth.getUser()
```
- Validates current session token
- Returns user or error

### 3.2 Registration Flow

#### 3.2.1 Registration Process Steps

1. **User Input Collection** (`/auth/register`)
   - User enters email, password, password confirmation
   - Client validates input format
   - User accepts terms of service

2. **Client-Side Validation**
   - Email format check (HTML5 + custom)
   - Password strength check (min 6 characters)
   - Password match confirmation
   - Terms acceptance validation

3. **API Request** (`POST /api/auth/register`)
   - Submit email and password (confirmation not sent to API)
   - Include CSRF protection if applicable

4. **Server-Side Validation**
   - Zod schema validates and transforms data
   - Email normalized (lowercase, trimmed)
   - Password length checked

5. **Service Layer Processing**
   - `AuthService.register()` called
   - Checks if email already exists (via Supabase)
   - Returns 409 if duplicate email

6. **Supabase User Creation**
   - `supabase.auth.signUp()` creates user
   - Password hashed by Supabase (bcrypt)
   - User ID generated (UUID)
   - Email confirmation sent (optional, can be disabled)

7. **Session Creation**
   - Supabase returns access and refresh tokens
   - Tokens included in API response

8. **Client-Side Session Storage**
   - Client receives tokens
   - Stores in localStorage (handled by Supabase SDK)
   - Redirects to `/dashboard`

9. **First Login Experience**
   - User immediately authenticated after registration
   - No manual login required
   - Session persists across browser sessions

#### 3.2.2 Registration Security Measures

- Password hashing: bcrypt via Supabase
- Email uniqueness: Enforced at database level
- Rate limiting: Configurable in Supabase project settings
- Email verification: Optional (disabled by default for MVP)
- No external providers: Email/password only (per requirements)

### 3.3 Login Flow

#### 3.3.1 Login Process Steps

1. **User Input Collection** (`/auth/login`)
   - User enters email and password
   - Client validates format

2. **Client-Side Validation**
   - Email format check
   - Password required check

3. **API Request** (`POST /api/auth/login`)
   - Submit credentials to API
   - Include CSRF protection if applicable

4. **Server-Side Validation**
   - Zod schema validates input
   - Email normalized (lowercase, trimmed)

5. **Service Layer Authentication**
   - `AuthService.login()` called
   - Calls `supabase.auth.signInWithPassword()`

6. **Supabase Authentication**
   - Validates email and password
   - Returns generic error if invalid (doesn't specify which field)
   - Returns user and session if valid

7. **Session Creation**
   - Access and refresh tokens generated
   - Tokens included in API response

8. **Client-Side Session Storage**
   - Tokens stored in localStorage
   - Session persists

9. **Post-Login Redirect**
   - Check for `redirect_after_login` cookie
   - Redirect to stored URL or default to `/dashboard`
   - Clear redirect cookie

#### 3.3.2 Login Security Measures

- Generic error messages (don't reveal if email exists)
- Password never logged or exposed in errors
- Rate limiting on login endpoint (Supabase manages)
- Brute force protection (configurable in Supabase)
- Session token rotation on refresh

### 3.4 Logout Flow

#### 3.4.1 Logout Process Steps

1. **User Action**
   - User clicks "Sign Out" in TopNav dropdown

2. **Client-Side Request** (JavaScript)
   - Calls `POST /api/auth/logout` via fetch

3. **Server-Side Logout**
   - API route calls `supabase.auth.signOut()`
   - Supabase invalidates session on server

4. **Client-Side Cleanup**
   - Supabase client clears localStorage tokens
   - Session removed from client state

5. **Redirect**
   - JavaScript redirects to `/auth/login`
   - User sees login page

#### 3.4.2 Logout Security Considerations

- Server-side session invalidation (not just client-side)
- All tokens revoked
- Subsequent requests with old tokens rejected
- No sensitive data remains in browser storage

### 3.5 Password Recovery Flow

#### 3.5.1 Password Recovery Process Steps

**Phase 1: Request Reset**

1. **User Initiates Recovery** (`/auth/login`)
   - User clicks "Forgot Password?" link

2. **Reset Request Page** (`/auth/forgot-password`)
   - User enters email address
   - Submits form

3. **API Request** (`POST /api/auth/forgot-password`)
   - Email sent to API

4. **Server-Side Processing**
   - Validates email format
   - Calls `AuthService.requestPasswordReset()`

5. **Supabase Password Reset**
   - Calls `supabase.auth.resetPasswordForEmail()`
   - Generates reset token
   - Sends email with magic link
   - Email contains URL: `${APP_URL}/auth/reset-password?token=...`

6. **Success Response**
   - API returns success message (always, even if email doesn't exist)
   - Client shows: "If that email exists, we've sent a reset link"

**Phase 2: Complete Reset**

7. **User Clicks Email Link**
   - Opens email
   - Clicks reset link
   - Browser opens `/auth/reset-password?token=...`

8. **Reset Password Page Loads**
   - Server validates token presence
   - Page shows new password form
   - If token invalid/expired: Show error message

9. **User Enters New Password**
   - Enters new password
   - Confirms password
   - Submits form

10. **API Request** (`POST /api/auth/reset-password`)
    - New password sent to API
    - Token extracted from Supabase session (set by magic link)

11. **Server-Side Password Update**
    - Validates password format
    - Calls Supabase `updateUser({ password })`
    - Supabase validates token and updates password

12. **Success Response**
    - Returns success message
    - Client redirects to `/auth/login`
    - Shows success banner: "Password updated. Please log in."

#### 3.5.2 Password Recovery Security Measures

- Reset tokens expire (default: 1 hour)
- One-time use tokens
- Generic success messages (don't reveal email existence)
- Token in URL parameter, not visible in email body
- HTTPS required for reset links
- Old password immediately invalidated upon reset

### 3.6 Session Persistence and Refresh

#### 3.6.1 Session Persistence Strategy

**Client-Side Persistence:**
- Supabase SDK stores tokens in `localStorage`
- Session survives browser restarts
- Tokens automatically sent with requests

**Token Storage Location:**
- Key: `supabase.auth.token`
- Value: JSON with access_token, refresh_token, expires_at

**Cross-Tab Synchronization:**
- Supabase SDK handles multi-tab session sync
- Logout in one tab logs out all tabs
- Login in one tab authenticates all tabs

#### 3.6.2 Automatic Token Refresh

**Refresh Mechanism:**
- Access token expires after 1 hour (default)
- Supabase SDK checks expiration before each request
- If expired or near expiration: Automatically refreshes
- Uses refresh token to obtain new access token
- Seamless to application code

**Refresh Failure Handling:**
- If refresh token invalid/expired: Session ends
- Client-side SDK triggers logout event
- Application redirects to login
- User must re-authenticate

#### 3.6.3 Server-Side Session Validation

**Per-Request Validation:**
- Every protected API route calls `authenticate(supabase)`
- Extracts token from request (Authorization header or cookie)
- Supabase validates token signature and expiration
- Returns user or error

**Invalid Session Responses:**
- 401 Unauthorized
- Client detects 401 and redirects to login
- Original URL stored for post-login redirect

### 3.7 Authorization and Row-Level Security

#### 3.7.1 Supabase RLS Policies

**Current Implementation:**
Existing database tables (events, guests, tables, etc.) have RLS policies that filter by `user_id`.

**Policy Pattern:**
```sql
-- Example for events table
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  USING (auth.uid() = user_id);
```

**Benefits:**
- Database-level security
- Prevents SQL injection bypassing authorization
- Automatic filtering of queries
- No application-layer authorization code needed

**No changes required** - existing RLS policies sufficient

#### 3.7.2 Application-Layer Authorization

**Current Pattern:**
- Services receive `user_id` in command objects
- Supabase client automatically includes `user_id` in auth context
- RLS policies enforce user isolation at database level
- No manual authorization checks needed in application code

**Example:**
```typescript
// API route
const { user } = await authenticate(supabase);
const eventService = new EventService(supabase);
const events = await eventService.listEvents(user.id);
// RLS ensures only user's events returned
```

### 3.8 Security Considerations

#### 3.8.1 Password Security

- **Storage:** Bcrypt hashed by Supabase
- **Strength:** Minimum 6 characters (can be increased)
- **Transmission:** Always over HTTPS
- **Never Logged:** Passwords excluded from logs
- **No plaintext:** Never stored or transmitted in plain text

#### 3.8.2 Token Security

- **JWT Tokens:** Signed by Supabase with secret key
- **Short-Lived Access Tokens:** 1-hour expiration
- **Secure Storage:** localStorage (acceptable for public client)
- **Token Rotation:** New tokens issued on refresh
- **Revocation:** Server-side logout invalidates tokens

#### 3.8.3 Network Security

- **HTTPS Required:** All production traffic encrypted
- **CORS:** Configured in Supabase for allowed origins
- **CSP Headers:** Content Security Policy headers (configure in Astro)
- **No Secrets in Client:** Only anon key exposed (safe, RLS enforced)

#### 3.8.4 Attack Prevention

- **SQL Injection:** Prevented by Supabase client parameterization
- **XSS:** Astro auto-escapes by default, React also escapes
- **CSRF:** Stateless tokens, no session cookies (less risk)
- **Brute Force:** Rate limiting in Supabase (configurable)
- **Email Enumeration:** Generic error messages prevent user discovery

#### 3.8.5 Privacy and Compliance

- **Minimal Data Collection:** Only email and password
- **Email Verification:** Optional (can enable for compliance)
- **Password Reset:** Secure token-based flow
- **Account Deletion:** Can be added to account settings page
- **Data Isolation:** RLS ensures user data segregation

---

## 4. IMPLEMENTATION MODULES AND CONTRACTS

### 4.1 New Files to Create

#### 4.1.1 Pages

1. **`src/pages/auth/register.astro`**
   - Registration form page
   - Pattern: Similar to existing `login.astro`
   - Includes: Email, password, password confirmation, terms checkbox
   - API: Calls `POST /api/auth/register`

2. **`src/pages/auth/forgot-password.astro`**
   - Password reset request form
   - Pattern: Similar to `login.astro`
   - Includes: Email input, submit button
   - API: Calls `POST /api/auth/forgot-password`

3. **`src/pages/auth/reset-password.astro`**
   - Password reset completion form
   - Pattern: Similar to `login.astro`
   - Includes: New password, confirm password
   - API: Calls `POST /api/auth/reset-password`
   - Server-side: Validates reset token presence

#### 4.1.2 API Routes

1. **`src/pages/api/auth/forgot-password.ts`**
   - Endpoint: `POST /api/auth/forgot-password`
   - Handler: Validates email, calls `AuthService.requestPasswordReset()`
   - Response: Always success (security)

2. **`src/pages/api/auth/reset-password.ts`**
   - Endpoint: `POST /api/auth/reset-password`
   - Handler: Validates password, calls new `AuthService.resetPassword()`
   - Response: Success or error

3. **`src/pages/api/auth/session.ts` (Optional)**
   - Endpoint: `GET /api/auth/session`
   - Handler: Validates session, returns user or 401
   - Use Case: Client-side session checking

#### 4.1.3 Service Methods

1. **`AuthService.resetPassword(newPassword: string)`**
   - Location: Add to `src/services/auth.service.ts`
   - Calls: `supabase.auth.updateUser({ password })`
   - Returns: `PasswordResetResponseDto`

### 4.2 Files to Modify

#### 4.2.1 Components

1. **`src/components/TopNav.astro`**
   - Add conditional rendering based on authentication state
   - Unauthenticated: Show "Sign In" and "Sign Up" buttons
   - Authenticated: Show existing user menu
   - Fetch user email from server context
   - Replace hardcoded email with actual user email

#### 4.2.2 Pages

1. **`src/pages/index.astro`**
   - Add authentication check in frontmatter
   - If authenticated: Redirect to `/dashboard`
   - If not: Show welcome content with auth CTA buttons

2. **`src/pages/auth/login.astro`**
   - Add "Forgot Password?" link
   - Add "Don't have an account? Register" link
   - Add password visibility toggle
   - Enhance error messaging

3. **Protected Pages** (all listed in section 1.1.2)
   - Add authentication check in frontmatter
   - Store intended URL in cookie
   - Redirect to `/auth/login` if not authenticated

#### 4.2.3 Middleware

1. **`src/middleware/auth.ts`**
   - Add `requireAuth()` helper for page protection
   - Handles redirect logic
   - Returns authenticated user or redirects

### 4.3 Component Contracts

#### 4.3.1 TopNav Component Interface

**Props:** None (reads from Astro context)

**Server Context Requirements:**
- `Astro.locals.supabase` - Supabase client
- Calls `authenticate()` in frontmatter
- Passes user to component slots or conditional rendering

**Rendering States:**
1. Loading (initial render)
2. Authenticated (show user menu)
3. Not authenticated (show sign in/up buttons)

#### 4.3.2 Authentication Form Pattern

**Common Structure:**
```astro
---
import AppShell from "../../layouts/AppShell.astro";
export const prerender = false;
---

<AppShell title="Page Title">
  <div class="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-lg border border-white/40">
    <h1 class="text-2xl font-bold mb-4 text-gray-900">Title</h1>
    <form id="formId" class="space-y-4">
      <!-- Form fields -->
      <button type="submit" class="w-full rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 shadow">
        Submit
      </button>
      <p id="statusEl" class="text-sm text-red-600 hidden" aria-live="polite"></p>
    </form>
  </div>

  <script>
    const form = document.getElementById('formId');
    const statusEl = document.getElementById('statusEl');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.classList.add('hidden');

      // Collect form data
      // Validate
      // Submit to API
      // Handle response
    });
  </script>
</AppShell>
```

### 4.4 API Route Contracts

#### 4.4.1 Standard API Response Format

**Success Response:**
```typescript
{
  // Response-specific data
}
```

**Error Response:**
```typescript
{
  error: string;           // Error category
  message: string;         // User-facing message
  code?: string;           // Machine-readable code
  details?: array;         // Validation errors
  request_id?: string;     // For debugging
}
```

#### 4.4.2 Authentication Requirement Pattern

**Protected API Routes:**
```typescript
export const POST: APIRoute = async ({ locals, request }) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = locals.supabase;

    // Authenticate
    const { user, error: authError } = await authenticate(supabase);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required"
      }), { status: 401 });
    }

    // Rest of handler logic
  } catch (error) {
    // Error handling
  }
};
```

### 4.5 Service Layer Contracts

#### 4.5.1 AuthService Interface

```typescript
interface IAuthService {
  register(data: RegisterRequestDto): Promise<AuthResponseDto>;
  login(data: LoginRequestDto): Promise<AuthResponseDto>;
  logout(): Promise<LogoutResponseDto>;
  requestPasswordReset(data: PasswordResetRequestDto): Promise<PasswordResetResponseDto>;
  resetPassword(newPassword: string): Promise<PasswordResetResponseDto>;  // New
  getCurrentUser(): Promise<UserDto | null>;
}
```

#### 4.5.2 Error Contract

**Service-layer errors thrown as typed Error objects:**
- `throw new Error("INVALID_CREDENTIALS")` - Login failure
- `throw new Error("EMAIL_ALREADY_EXISTS")` - Registration conflict
- Generic Error for other failures

**API routes catch and convert to appropriate HTTP responses.**

### 4.6 Type Definitions

All required types already exist in `src/types.ts`:

**Request DTOs:**
- `RegisterRequestDto`
- `LoginRequestDto`
- `PasswordResetRequestDto`

**Response DTOs:**
- `AuthResponseDto` (user + session)
- `LogoutResponseDto`
- `PasswordResetResponseDto`
- `UserDto`
- `SessionDto`

**No new types required.**

---

## 5. COMPATIBILITY WITH EXISTING FEATURES

### 5.1 Existing Event Management Features

**Impact:** None - Authentication is additive

**Integration Points:**
- Event CRUD operations already filter by `user_id`
- RLS policies already enforce user isolation
- Services already receive user context
- No changes to event management logic required

**Protected Routes:**
- All event pages receive authentication checks
- Unauthenticated users redirected to login
- After login, redirected back to intended event page

### 5.2 Guest and Table Management

**Impact:** None - Already designed for multi-user

**Integration Points:**
- Guests and tables belong to events
- Events belong to users
- RLS cascade ensures data isolation
- No changes to guest/table logic required

**Guest Import Functionality (US-002):**
- PRD Requirement: "User can import guest lists from a file"
- **Authentication Requirement:** Guest import pages/endpoints protected by authentication
- **User Context:** Imported guests automatically associated with authenticated user's event
- **RLS Enforcement:** User can only import guests into their own events
- **Implementation Note:** Any guest import API endpoint follows standard authentication pattern (Section 2.1)
- **File Upload Security:** Multipart form data endpoints still require authentication header validation

### 5.3 Seating Plan Generation (AI)

**Impact:** None - User context already available

**Integration Points:**
- AI generation receives event context
- Event ownership validated via RLS
- User ID passed through service layer
- No changes to AI logic required

### 5.4 Data Isolation and Privacy

**Enforcement Mechanisms:**
1. **Database Level:** RLS policies on all tables
2. **Service Level:** User ID required in commands
3. **API Level:** Authentication check before operations
4. **Client Level:** Only user's data returned in responses

**No cross-user data leakage possible** due to multi-layer enforcement.

### 5.5 Development Mode Bypass

**Feature:** `DISABLE_AUTH=true` environment variable

**Purpose:**
- Allows testing without authentication during development
- Speeds up local development workflow
- Returns mock test user instead of validating tokens

**Production Safety:**
- Must be set to `false` or omitted in production
- Clearly logged when active ("DEVELOPMENT MODE - Authentication bypassed")
- Should be disabled in `.env.production`

**No impact on production deployments** if properly configured.

---

## 6. DEPLOYMENT AND CONFIGURATION

### 6.1 Environment Variables

**Required Variables:**
- `SUPABASE_URL` - Supabase project URL (existing)
- `SUPABASE_KEY` - Supabase anon key (existing)
- `PUBLIC_APP_URL` - Application base URL (for password reset emails)
- `DISABLE_AUTH` - Optional, "true" to bypass auth in development (existing)

**Configuration Files:**
- `.env` - Local development
- `.env.production` - Production deployment
- Ensure `DISABLE_AUTH=false` in production

### 6.2 Supabase Configuration

**Email Templates:**
- Configure in Supabase Dashboard → Authentication → Email Templates
- Customize password reset email template
- Set sender name and email address
- Ensure `{{ .ConfirmationURL }}` token in template

**Auth Settings:**
- Email confirmation: Optional (disable for MVP)
- Password requirements: Minimum 6 characters (configurable)
- Rate limiting: Configure to prevent abuse
- Redirect URLs: Whitelist `${APP_URL}/auth/reset-password`

**Row-Level Security:**
- Ensure RLS enabled on all tables
- Verify policies filter by `auth.uid()`
- Test with multiple user accounts

### 6.3 Deployment Checklist

- [ ] Environment variables set in production environment
- [ ] `DISABLE_AUTH=false` in production
- [ ] HTTPS configured for production domain
- [ ] Supabase redirect URLs include production domain
- [ ] Email templates customized with branding
- [ ] CORS settings allow production domain
- [ ] Test registration flow end-to-end
- [ ] Test login flow with valid credentials
- [ ] Test login flow with invalid credentials
- [ ] Test password reset flow end-to-end
- [ ] Test logout functionality
- [ ] Test protected page access (not authenticated)
- [ ] Test protected page access (authenticated)
- [ ] Verify RLS policies enforced
- [ ] Check error messages are user-friendly
- [ ] Verify no sensitive data in error responses
- [ ] Test session persistence across browser restarts
- [ ] Test multi-tab session synchronization

---

## 7. TESTING STRATEGY

### 7.1 Unit Testing

**Service Layer Tests:**
- `AuthService.register()` - Success and error cases
- `AuthService.login()` - Success and error cases
- `AuthService.logout()` - Success case
- `AuthService.requestPasswordReset()` - Success case
- `AuthService.resetPassword()` - Success and error cases
- Mock Supabase client for isolation

**Validator Tests:**
- Schema validation for all auth DTOs
- Edge cases (empty strings, special characters, max lengths)
- Email format validation
- Password length validation

### 7.2 Integration Testing

**API Route Tests:**
- POST /api/auth/register - Valid registration
- POST /api/auth/register - Duplicate email
- POST /api/auth/login - Valid credentials
- POST /api/auth/login - Invalid credentials
- POST /api/auth/logout - Authenticated user
- POST /api/auth/forgot-password - Existing email
- POST /api/auth/forgot-password - Non-existing email
- POST /api/auth/reset-password - Valid token
- POST /api/auth/reset-password - Invalid token

**Protected Route Tests:**
- Access protected page without authentication → 302 redirect
- Access protected page with valid session → 200 OK
- Access protected page with expired session → 302 redirect

### 7.3 End-to-End Testing

**User Flow Tests:**
1. New user registration → Dashboard access
2. Logout → Login with credentials → Dashboard access
3. Forgot password → Reset via email → Login with new password
4. Access protected page → Login → Redirect to original page
5. Session persistence across browser restarts
6. Multi-tab logout synchronization

**Browser Testing:**
- Chrome, Firefox, Safari, Edge
- Desktop and mobile viewports
- localStorage availability check

### 7.4 Security Testing

**Authentication Tests:**
- Password hashing verification (bcrypt)
- Token expiration enforcement
- Invalid token rejection
- SQL injection attempts (parameterization check)
- XSS attempts (escaping check)

**Authorization Tests:**
- User A cannot access User B's events
- User A cannot modify User B's data
- RLS policy enforcement
- API direct access with manipulated user IDs

---

## 8. SUMMARY

### 8.1 Key Components

**New Pages:**
- Registration page (`/auth/register`)
- Forgot password page (`/auth/forgot-password`)
- Reset password page (`/auth/reset-password`)

**New API Endpoints:**
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

**Modified Components:**
- TopNav: Conditional rendering based on auth state
- Login page: Enhanced with links and UX improvements
- All protected pages: Authentication checks added

**New Service Methods:**
- `AuthService.resetPassword()`

### 8.2 Architecture Highlights

**Frontend:**
- Server-side rendered Astro pages
- Inline client-side scripts for form handling
- No React components for auth forms (keep it simple)
- Consistent error handling and loading states

**Backend:**
- Supabase Auth for all authentication operations
- Service-layer abstraction for business logic
- Zod validation for input sanitization
- Row-level security for data isolation

**Security:**
- Bcrypt password hashing (via Supabase)
- JWT token-based sessions
- Automatic token refresh
- Generic error messages for security
- HTTPS required in production

### 8.3 Integration with Existing System

**No Breaking Changes:**
- All existing features continue to work
- Authentication is purely additive
- Existing services already designed for user context
- RLS policies already enforce isolation

**Enhanced Security:**
- Previously open pages now require authentication
- User data properly isolated
- Session management formalized

### 8.4 Development Approach

**Phased Implementation:**
1. Create new authentication pages
2. Create new API endpoints
3. Add authentication checks to protected pages
4. Enhance TopNav with conditional rendering
5. Test all flows end-to-end
6. Deploy with proper configuration

**Development-Friendly:**
- `DISABLE_AUTH=true` for local development
- Mock user available in development mode
- No email configuration required for local testing

### 8.5 Production Readiness

**Requirements:**
- Configure environment variables
- Set up Supabase email templates
- Enable HTTPS on production domain
- Configure CORS and redirect URLs
- Test all flows in production environment
- Monitor authentication errors and failures

---

## APPENDIX A: Example Code Snippets

### A.1 Protected Page Pattern

```astro
---
// src/pages/dashboard.astro
import AppShell from "../layouts/AppShell.astro";
import { authenticate } from "../middleware/auth";

export const prerender = false;

// Authentication check
const { user, error } = await authenticate(Astro.locals.supabase);

if (error || !user) {
  // Store intended destination
  Astro.cookies.set('redirect_after_login', Astro.url.pathname, {
    path: '/',
    maxAge: 60 * 5, // 5 minutes
  });
  return Astro.redirect('/auth/login');
}

// Fetch user-specific data
const userId = user.id;
// ... rest of page logic
---

<AppShell title="Dashboard">
  <!-- Page content -->
</AppShell>
```

### A.2 API Route with Authentication

```typescript
// src/pages/api/events/index.ts
import type { APIRoute } from "astro";
import { authenticate } from "../../../middleware/auth";
import { EventService } from "../../../services/events.service";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const supabase = locals.supabase;

    // Authenticate request
    const { user, error: authError } = await authenticate(supabase);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Fetch user's events
    const eventService = new EventService(supabase);
    const events = await eventService.listEvents(user.id);

    return new Response(JSON.stringify({ data: events }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    // Error handling
  }
};
```

### A.3 Enhanced TopNav with Auth State

```astro
---
// src/components/TopNav.astro
import { authenticate } from "../middleware/auth";

// Check authentication status
const { user } = await authenticate(Astro.locals.supabase);
const isAuthenticated = !!user;
const userEmail = user?.email || "";
---

<nav class="border-b border-border/40 bg-white sticky top-0 z-40">
  <div class="mx-auto max-w-7xl px-6 py-3">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <div class="flex items-center gap-6">
        <a href={isAuthenticated ? "/dashboard" : "/"} class="flex items-center gap-2">
          <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <!-- Icon path -->
          </svg>
          <span class="text-lg font-semibold tracking-tight">SittingPlanner</span>
        </a>
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-3">
        {isAuthenticated ? (
          <>
            <a href="/dashboard" class="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
              Dashboard
            </a>
            <div class="relative">
              <button id="userMenuBtn" class="flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-accent transition-all duration-150" aria-label="User menu">
                <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <!-- Icon path -->
                  </svg>
                </div>
                <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <!-- Icon path -->
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div id="userMenuDropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-border py-2">
                <div class="px-4 py-2 border-b border-border/40 mb-2">
                  <p class="text-sm font-semibold text-foreground">User Account</p>
                  <p class="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
                </div>
                <a href="/account" class="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <!-- Icon path -->
                  </svg>
                  Account Settings
                </a>
                <button id="logoutBtn" class="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors duration-150">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <!-- Icon path -->
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <a href="/auth/login" class="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
              Sign In
            </a>
            <a href="/auth/register" class="inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium bg-pink-500 hover:bg-pink-600 text-white transition-colors">
              Sign Up
            </a>
          </>
        )}
      </div>
    </div>
  </div>
</nav>

<script>
  // Only run if authenticated
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenuDropdown = document.getElementById("userMenuDropdown");

  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userMenuDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!userMenuBtn.contains(e.target as Node) && !userMenuDropdown.contains(e.target as Node)) {
        userMenuDropdown.classList.add("hidden");
      }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn?.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        if (res.ok) {
          window.location.href = "/auth/login";
        }
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
  }
</script>
```

---

## APPENDIX B: Environment Configuration

### B.1 Development Environment (.env)

```env
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-local-anon-key

# Application Configuration
PUBLIC_APP_URL=http://localhost:3000

# Authentication Bypass (Development Only)
DISABLE_AUTH=true
```

### B.2 Production Environment (.env.production)

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-production-anon-key

# Application Configuration
PUBLIC_APP_URL=https://yourdomain.com

# Authentication Bypass (MUST BE FALSE)
DISABLE_AUTH=false
```

---

## APPENDIX C: Supabase Email Template

### C.1 Password Reset Email Template

**Subject:** Reset Your Password

**Body (HTML):**
```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>We received a request to reset your password for your SittingPlanner account.</p>

<p>Click the button below to choose a new password:</p>

<p>
  <a href="{{ .ConfirmationURL }}"
     style="display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
    Reset Password
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 1 hour.</p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>

<p>Thanks,<br>The SittingPlanner Team</p>
```

**Note:** Configure in Supabase Dashboard → Authentication → Email Templates → Reset Password

---

**End of Specification**
