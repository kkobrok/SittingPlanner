# Plan: Re-Enable Authentication in SittingPlanner

## Overview

This document contains the complete plan and instructions for re-enabling authentication in the SittingPlanner application after it has been temporarily disabled for development.

**Date Created:** 2025-11-16
**Current Status:** Authentication is BYPASSED (DISABLE_AUTH=true)
**Target Status:** Full authentication enabled

---

## Quick Summary

Authentication was temporarily disabled using an environment flag (`DISABLE_AUTH=true`) and a centralized auth helper function (`src/middleware/auth.ts`). To re-enable:

1. Set `DISABLE_AUTH=false` in `.env` (or remove the variable)
2. Optionally remove the bypass code from `src/middleware/auth.ts`
3. Test all endpoints with valid JWT tokens

---

## Current Implementation

### Files Modified for Auth Bypass

1. **`src/middleware/auth.ts`** - Created
   - Centralized authentication helper
   - Contains bypass logic when `DISABLE_AUTH=true`
   - Returns mock test user in development mode

2. **`.env.example`** - Modified
   - Added `DISABLE_AUTH=true` flag and documentation
   - Lines 18-30 contain auth bypass configuration

3. **All API Endpoints** - Modified (13 files)
   - Replaced `supabase.auth.getUser()` calls with `authenticate(supabase)`
   - No other auth logic changed

### Mock Test User (Development Mode)

When `DISABLE_AUTH=true`, the following user is returned:

```typescript
{
  id: "31ba67c4-baaf-4ac2-881d-8de304b1d7ae",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated"
}
```

This corresponds to the test user in local Supabase.

---

## Re-Enable Authentication: Step-by-Step

### Option 1: Simple Toggle (Recommended)

**Effort:** 30 seconds
**Risk:** Minimal
**Reversibility:** Instant

1. Open `.env` file
2. Change `DISABLE_AUTH=true` to `DISABLE_AUTH=false`
3. Restart dev server: `npm run dev`
4. Test with valid JWT token

**Advantages:**
- Instant toggle
- Can switch back immediately if needed
- Zero code changes
- Preserves bypass capability for future development

**Use this if:** You might need to disable auth again later

### Option 2: Complete Removal (Clean)

**Effort:** 15 minutes
**Risk:** Low
**Reversibility:** Requires re-implementation

**Step 1: Update Environment**
```bash
# In .env file
DISABLE_AUTH=false
# Or delete the line entirely
```

**Step 2: Remove Auth Helper (Optional)**

If you want to completely remove the bypass code:

1. Delete file: `src/middleware/auth.ts`
2. Revert all API endpoints to direct Supabase calls
3. Update `.env.example` to remove DISABLE_AUTH documentation

**Step 3: Revert API Endpoints**

Replace all instances of:
```typescript
import { authenticate } from "../../../middleware/auth";

const { user, error: authError } = await authenticate(supabase);
```

With original code:
```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
```

**Use this if:** You're confident auth bypass won't be needed again

---

## Automated Re-Enable Prompt

Copy and paste this prompt to Claude Code to automatically re-enable authentication:

```
Your task is to re-enable authentication in the SittingPlanner project.

Current state:
- Authentication is bypassed via DISABLE_AUTH=true flag
- src/middleware/auth.ts contains bypass logic
- All API endpoints use authenticate() helper

Please do the following:

1. Update .env file:
   - Change DISABLE_AUTH=true to DISABLE_AUTH=false

2. Update .env.example:
   - Change DISABLE_AUTH=true to DISABLE_AUTH=false
   - Update documentation to indicate production mode

3. Test the change:
   - Verify dev server compiles
   - Confirm endpoints now require valid JWT tokens

Do NOT remove the auth helper or revert endpoint code yet - we want the
ability to toggle back if needed.

After completion, provide a summary of what was changed and how to test
that authentication is working correctly.
```

---

## Testing Re-Enabled Authentication

### Prerequisites

1. Valid Supabase user account
2. JWT token from successful login

### Test Endpoints

**1. Test Protected Endpoint (Should Fail Without Token)**
```bash
curl http://localhost:4321/api/events \
  -H "Content-Type: application/json"

# Expected: 401 Unauthorized
```

**2. Test with Valid Token**
```bash
# First, login to get token
curl http://localhost:4321/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your-password"
  }'

# Use the returned access_token in subsequent requests
curl http://localhost:4321/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: 200 OK with events data
```

**3. Test All Critical Endpoints**

After re-enabling, test these endpoints:
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `POST /api/events/{id}/seating-plans/generate` - Generate seating plan
- `GET /api/events/{id}/assignments` - Get assignments

All should:
- Return 401 without token
- Return appropriate response with valid token
- Return 403 for resources not owned by user

---

## Rollback Plan

If re-enabling authentication causes issues:

**Immediate Rollback (30 seconds):**
1. Open `.env`
2. Change `DISABLE_AUTH=false` back to `DISABLE_AUTH=true`
3. Restart dev server
4. Auth is bypassed again

**Troubleshooting:**

**Issue:** "401 Unauthorized" on all requests
- Cause: DISABLE_AUTH=false but no valid token provided
- Solution: Obtain valid JWT token from login endpoint

**Issue:** "User not found" errors
- Cause: Test user doesn't exist in database
- Solution: Create user via `/api/auth/register` or Supabase admin

**Issue:** "Forbidden" errors on resources
- Cause: Resource belongs to different user
- Solution: Ensure test data belongs to authenticated user ID

---

## Modified API Endpoints

All of these files were changed to use `authenticate()` helper:

1. `src/pages/api/events/index.ts`
2. `src/pages/api/events/[id].ts`
3. `src/pages/api/events/[id]/assignments.ts`
4. `src/pages/api/events/[id]/guests.ts`
5. `src/pages/api/events/[id]/relationships.ts`
6. `src/pages/api/events/[id]/tables.ts`
7. `src/pages/api/events/[id]/seating-plans/generate.ts`
8. `src/pages/api/events/[id]/seating-plans/validate.ts`
9. `src/pages/api/assignments/[id].ts`
10. `src/pages/api/guests/[id].ts`
11. `src/pages/api/tables/[id].ts`
12. `src/pages/api/relationships/[id].ts`
13. `src/pages/api/seating-plans/[id].ts`

**Not modified:** `/api/auth/*` endpoints (login, register, logout) - these don't require authentication

---

## Code Diff Reference

**Before (Original):**
```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();

if (authError || !user) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Invalid or expired token",
      code: "auth_invalid_token",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**After (With Auth Helper):**
```typescript
import { authenticate } from "../../../middleware/auth";

const { user, error: authError } = await authenticate(supabase);

if (authError || !user) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Invalid or expired token",
      code: "auth_invalid_token",
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**Change:** Only the auth check itself - rest of endpoint logic unchanged

---

## Security Considerations

### Production Deployment Checklist

Before deploying to production:

- [ ] `DISABLE_AUTH` is set to `false` (or removed from `.env`)
- [ ] `.env.example` shows `DISABLE_AUTH=false` or is commented out
- [ ] Dev console shows no "[Auth] DEVELOPMENT MODE" logs
- [ ] All test endpoints return 401 without valid tokens
- [ ] Supabase RLS policies are enabled
- [ ] API keys are properly configured and not exposed

### Preventing Accidental Production Bypass

**Option A: Runtime Check**
Add to `src/middleware/auth.ts`:
```typescript
export async function authenticate(supabase: SupabaseClient<Database>): Promise<AuthResult> {
  const disableAuth = import.meta.env.DISABLE_AUTH === "true";

  // Fail fast in production
  if (disableAuth && import.meta.env.PROD) {
    throw new Error("DISABLE_AUTH cannot be enabled in production!");
  }

  // ... rest of function
}
```

**Option B: Build-time Check**
Add to `astro.config.mjs`:
```javascript
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_AUTH === 'true') {
  throw new Error('Cannot build for production with DISABLE_AUTH=true');
}
```

---

## FAQ

**Q: Will re-enabling auth break existing API integrations?**
A: If integrations are already sending JWT tokens in Authorization headers, no. If they're relying on the bypass, yes - they'll need to authenticate properly.

**Q: Do I need to migrate the database?**
A: No. Auth bypass only affects API endpoints, not database schema or data.

**Q: Can I keep auth disabled for some endpoints but not others?**
A: Yes. Modify `authenticate()` to check endpoint path and bypass selectively. Not recommended for security reasons.

**Q: How do I get a valid JWT token for testing?**
A: Call `POST /api/auth/login` with valid credentials. The response includes an `access_token` field.

**Q: What if I deleted my test user?**
A: Create a new user via `POST /api/auth/register` or Supabase admin panel.

---

## Success Criteria

Authentication is successfully re-enabled when:

1. ✅ `DISABLE_AUTH=false` in `.env`
2. ✅ Dev server console shows no "DEVELOPMENT MODE" auth logs
3. ✅ Requests without tokens receive 401 Unauthorized
4. ✅ Requests with valid tokens receive appropriate responses
5. ✅ User ownership is correctly enforced (users can only access their own data)

---

## Contact & Support

If you encounter issues re-enabling authentication:

1. Check this document's troubleshooting section
2. Review the git diff to see exactly what changed
3. Use the rollback plan to restore auth bypass
4. Consult Supabase auth documentation: https://supabase.com/docs/guides/auth

---

**Document Version:** 1.0
**Last Updated:** 2025-11-16
**Related Files:**
- `src/middleware/auth.ts`
- `.env.example`
- All files in `src/pages/api/` (except `/auth/*`)
