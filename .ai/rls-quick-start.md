# RLS Migration Quick Start Guide

## 🚀 Execute in 3 Steps

### Step 1: Ensure Supabase Running
```bash
npx supabase status
# If not running: npx supabase start
```

### Step 2: Apply Migration
```bash
npx supabase db push
```

### Step 3: Verify Success
```bash
npx supabase migration list
# ✔ Should show: 20250129000000 enable_rls_with_policies
```

---

## ✅ Quick Validation

Run in Supabase Studio → SQL Editor:

```sql
-- Should return 6 rows with rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🔄 Rollback (If Needed)

```sql
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_plans DISABLE ROW LEVEL SECURITY;
```

---

## 📋 What This Does

- ✅ Enables RLS on **6 tables**
- ✅ Creates **24 policies** (SELECT, INSERT, UPDATE, DELETE per table)
- ✅ Adds **8 performance indexes**
- ✅ Creates helper function `auth.owns_event()`
- ✅ Security model: Users can only access their own event data

---

## ⚠️ Important Notes

1. **Requires Authentication:** All API calls must use authenticated Supabase client
2. **User Context:** Queries automatically filter to `user_id = auth.uid()`
3. **Performance:** ~5-10% overhead (optimized with indexes)
4. **Testing:** Use authenticated test users after migration

---

**Full Documentation:** See `.ai/rls-migration-instructions.md`

**Migration File:** `supabase/migrations/20250129000000_enable_rls_with_policies.sql`
