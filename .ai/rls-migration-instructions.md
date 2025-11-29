# RLS Migration Execution Instructions

## Document Information

**Migration File:** `supabase/migrations/20250129000000_enable_rls_with_policies.sql`
**Created:** 2025-01-29
**Purpose:** Enable Row Level Security (RLS) with comprehensive CRUD policies for all tables
**Status:** Ready for execution

---

## Overview

This migration re-enables Row Level Security (RLS) for all tables in the SittingPlanner database with granular, operation-specific policies. It supersedes the previous `20250116000000_disable_rls_for_dev.sql` migration that disabled RLS for local development.

### What This Migration Does

1. **Enables RLS** on all 6 tables: events, tables, guests, seating_assignments, guest_relationships, seating_plans
2. **Creates 24 policies** (4 per table: SELECT, INSERT, UPDATE, DELETE)
3. **Adds helper function** `auth.owns_event()` for policy reuse
4. **Creates performance indexes** for RLS policy lookups
5. **Grants permissions** to authenticated users (RLS filters access)

### Security Model

**User-Owned Data Pattern:**
- Users can only access data for events they own
- Security cascades through foreign key relationships
- Each CRUD operation has an explicit policy

---

## Prerequisites

Before executing this migration, ensure:

- [ ] **Supabase CLI installed** (v1.123.0+)
- [ ] **Local Supabase running** (or connected to remote instance)
- [ ] **Database backup created** (always backup before migrations!)
- [ ] **Authentication configured** (Supabase Auth must be enabled)
- [ ] **Test users exist** (for validation after migration)

---

## Execution Methods

### Method 1: Supabase CLI (Recommended)

This is the **preferred method** as it tracks migration history and handles rollbacks.

#### Step 1: Ensure Supabase is Running

```bash
# Check Supabase status
npx supabase status
```

**Expected output:**
```
✔ supabase local development setup is running.
         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
```

If not running:
```bash
# Start Supabase
npx supabase start
```

#### Step 2: Apply Migration

```bash
# Apply all pending migrations (including the new RLS migration)
npx supabase db push
```

**Alternative:** Apply specific migration only:
```bash
# Reset database and apply all migrations
npx supabase db reset

# Or apply migrations from scratch
npx supabase migration up
```

#### Step 3: Verify Migration Applied

```bash
# Check migration history
npx supabase migration list
```

**Expected output:**
```
    20250114000000 initial_schema
    20250115000000 add_events_performance_indexes
    20250116000000 disable_rls_for_dev
    20250118000000 add_seat_positions
    20250118000001 add_table_type
 ✔  20250129000000 enable_rls_with_policies  ← Should show checkmark
```

---

### Method 2: Supabase Studio (GUI)

For visual execution via the Supabase web interface.

#### Step 1: Open Supabase Studio

```bash
# If using local Supabase
http://localhost:54323
```

**Or** navigate to your Supabase project dashboard at https://app.supabase.com

#### Step 2: Navigate to SQL Editor

1. Click **"SQL Editor"** in left sidebar
2. Click **"New query"** button

#### Step 3: Copy Migration SQL

1. Open `supabase/migrations/20250129000000_enable_rls_with_policies.sql`
2. Copy entire contents
3. Paste into SQL Editor

#### Step 4: Execute Migration

1. Click **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for success message: ✔ Success. No rows returned

#### Step 5: Verify Execution

Run this validation query:
```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** All tables should show `rowsecurity = true`

---

### Method 3: Direct psql Connection

For advanced users who prefer command-line database access.

#### Step 1: Get Database Connection String

```bash
# Get connection details
npx supabase status
```

**DB URL example:** `postgresql://postgres:postgres@localhost:54322/postgres`

#### Step 2: Connect to Database

```bash
# Using psql
psql postgresql://postgres:postgres@localhost:54322/postgres
```

#### Step 3: Execute Migration

```sql
-- Load and execute migration file
\i supabase/migrations/20250129000000_enable_rls_with_policies.sql
```

**Or** execute directly:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/migrations/20250129000000_enable_rls_with_policies.sql
```

#### Step 4: Verify Execution

```sql
-- Check policies created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected:** 24 policies (4 per table × 6 tables)

---

## Post-Migration Validation

After applying the migration, run these tests to ensure RLS is working correctly.

### Test 1: Verify RLS Enabled

```sql
-- All tables should have rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

**Expected result:** Empty (no results means all tables have RLS enabled)

---

### Test 2: Verify Policies Created

```sql
-- Should return 24 policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected result:** 24 rows (4 policies per table)

**Sample output:**
```
tablename             | policyname                         | cmd
----------------------+------------------------------------+--------
events                | events_select_policy               | SELECT
events                | events_insert_policy               | INSERT
events                | events_update_policy               | UPDATE
events                | events_delete_policy               | DELETE
guests                | guests_select_policy               | SELECT
guests                | guests_insert_policy               | INSERT
...
```

---

### Test 3: Verify Helper Function Created

```sql
-- Check auth.owns_event function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'auth'
AND routine_name = 'owns_event';
```

**Expected result:** 1 row showing function exists

---

### Test 4: Verify Indexes Created

```sql
-- Check performance indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected result:** At least 8 indexes created by migration

---

### Test 5: Functional RLS Test (With Real User)

**Important:** This test requires authentication context.

```sql
-- Test 1: Create a test event (should work for authenticated user)
INSERT INTO events (name, date, user_id)
VALUES ('Test Event', '2025-12-31', auth.uid());

-- Test 2: Verify user can only see their own events
SELECT * FROM events;  -- Should only return events where user_id = auth.uid()

-- Test 3: Try to access another user's event (should fail)
SELECT * FROM events WHERE user_id != auth.uid();  -- Should return empty

-- Test 4: Clean up
DELETE FROM events WHERE name = 'Test Event';
```

---

### Test 6: Performance Test

Check that RLS policies use indexes efficiently:

```sql
-- Explain analyze to check index usage
EXPLAIN ANALYZE
SELECT * FROM events WHERE user_id = auth.uid();
```

**Look for:**
- ✅ "Index Scan using idx_events_user_id"
- ❌ NOT "Seq Scan" (sequential scan is slow)

---

## Troubleshooting

### Issue 1: Migration Already Applied

**Error:** `relation "events_select_policy" already exists`

**Solution:**
```bash
# Check migration status
npx supabase migration list

# If already applied, skip to validation tests
# If partially applied, rollback and reapply
npx supabase db reset
npx supabase migration up
```

---

### Issue 2: Authentication Errors

**Error:** `function auth.uid() does not exist`

**Cause:** Supabase Auth not properly configured

**Solution:**
```bash
# Restart Supabase to reinitialize auth
npx supabase stop
npx supabase start
```

---

### Issue 3: Permission Denied After Migration

**Error:** Users cannot access data after enabling RLS

**Cause:** Not authenticated or using wrong user context

**Solution:**
```typescript
// Ensure Supabase client is authenticated
const supabase = createClient(Astro.request);
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  // User must be logged in for RLS to work
  return redirect('/auth/login');
}
```

---

### Issue 4: Slow Query Performance

**Symptom:** Queries are slow after enabling RLS

**Solution:**
```sql
-- Check if indexes are being used
EXPLAIN ANALYZE SELECT * FROM events WHERE user_id = auth.uid();

-- If "Seq Scan" appears, indexes might be missing
-- Re-run index creation section of migration
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
```

---

### Issue 5: Foreign Key Policy Errors

**Error:** `new row violates row-level security policy for table "tables"`

**Cause:** Trying to insert data for an event the user doesn't own

**Solution:**
```typescript
// Verify event ownership before inserting related data
const { data: event } = await supabase
  .from('events')
  .select('id')
  .eq('id', eventId)
  .single();

if (!event) {
  throw new Error('Event not found or access denied');
}

// Now insert table
await supabase.from('tables').insert({
  event_id: eventId,  // ✅ User owns this event
  name: 'Table 1',
  capacity: 10
});
```

---

## Rollback Instructions

If you need to rollback this migration (return to dev mode without RLS):

### Option 1: Using Supabase CLI

```bash
# Rollback last migration
npx supabase migration repair --status reverted 20250129000000

# Or reset database to previous state
npx supabase db reset --version 20250118000001
```

### Option 2: Manual Rollback (SQL)

Execute this SQL in Supabase Studio or psql:

```sql
-- Disable RLS on all tables
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_plans DISABLE ROW LEVEL SECURITY;

-- Drop helper function
DROP FUNCTION IF EXISTS auth.owns_event(INTEGER);

-- Drop policies (they auto-drop when RLS disabled, but for cleanup)
DROP POLICY IF EXISTS events_select_policy ON events;
DROP POLICY IF EXISTS events_insert_policy ON events;
DROP POLICY IF EXISTS events_update_policy ON events;
DROP POLICY IF EXISTS events_delete_policy ON events;
-- (repeat for all tables)
```

---

## Production Deployment

When deploying to production (Supabase Cloud):

### Step 1: Link to Production Project

```bash
# Link local project to production
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Step 2: Push Migrations

```bash
# Push all migrations to production
npx supabase db push --linked
```

**⚠️ WARNING:** This will enable RLS in production. Ensure:
- All users are authenticated via Supabase Auth
- Application code uses authenticated Supabase clients
- Test in staging environment first

### Step 3: Monitor Production

After deployment, monitor:
- Query performance (RLS adds overhead)
- Error logs (check for access denied errors)
- User feedback (ensure no access issues)

---

## Application Code Changes Required

After enabling RLS, ensure application code uses authenticated clients:

### ✅ CORRECT: Authenticated Client

```typescript
// src/pages/api/events/[id].ts
import { createClient } from '@/db/supabase.client';

export const GET: APIRoute = async ({ request, locals }) => {
  // Get authenticated user from middleware
  const user = locals.user;
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create authenticated client (includes auth.uid())
  const supabase = createClient(request);

  // RLS will automatically filter to user's events
  const { data, error } = await supabase
    .from('events')
    .select('*');  // ✅ Only returns events where user_id = auth.uid()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
};
```

### ❌ INCORRECT: Unauthenticated Client

```typescript
// DON'T DO THIS - Bypasses RLS
const supabase = createClient(Astro.request, {
  global: {
    headers: {
      Authorization: 'Bearer ANON_KEY'  // ❌ Anon key has no user context
    }
  }
});
```

---

## Performance Considerations

### RLS Overhead

- **Read queries:** ~5-10% slower (due to policy evaluation)
- **Write queries:** ~10-15% slower (due to USING + WITH CHECK)
- **Mitigation:** Indexes created by migration minimize overhead

### Best Practices

1. **Use indexes:** Migration creates all necessary indexes
2. **Batch operations:** Group inserts/updates when possible
3. **Cache results:** Use React Query for client-side caching
4. **Monitor slow queries:** Use Supabase Dashboard → Performance

---

## Security Checklist

After migration, verify:

- [ ] RLS enabled on all 6 tables
- [ ] 24 policies created (4 per table)
- [ ] Helper function `auth.owns_event()` exists
- [ ] Performance indexes created
- [ ] Test user can only access their own data
- [ ] Functional tests pass
- [ ] Application code uses authenticated clients
- [ ] No "permission denied" errors in logs

---

## Support & References

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **Migration File:** `supabase/migrations/20250129000000_enable_rls_with_policies.sql`
- **DDD Architecture:** `.ai/ddd-domain-extraction.md`
- **Tech Stack:** `.ai/tech-stack.md`

---

## Changelog

| Date       | Version | Author   | Changes                                  |
|------------|---------|----------|------------------------------------------|
| 2025-01-29 | 1.0     | Dev Team | Initial RLS migration with 24 policies   |

---

**END OF INSTRUCTIONS**
