-- ============================================================================
-- Enable RLS with Comprehensive Policies for All Tables
-- ============================================================================
-- Created: 2025-01-29
-- Purpose: Re-enable Row Level Security (RLS) with granular CRUD policies
--          for all tables based on Supabase best practices
--
-- Security Model: User-owned data access pattern
-- - Users can only access data for events they own
-- - Cascade security through foreign key relationships
--
-- Reference: @supabase-migrations.mdc, @database.types.ts
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Helper function to check if user owns an event
CREATE OR REPLACE FUNCTION auth.owns_event(event_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events
    WHERE id = event_id_param
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- EVENTS TABLE RLS
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS events_user_policy ON events;
DROP POLICY IF EXISTS events_select_policy ON events;
DROP POLICY IF EXISTS events_insert_policy ON events;
DROP POLICY IF EXISTS events_update_policy ON events;
DROP POLICY IF EXISTS events_delete_policy ON events;

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own events
CREATE POLICY events_select_policy ON events
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can create events for themselves
CREATE POLICY events_insert_policy ON events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own events
CREATE POLICY events_update_policy ON events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own events
CREATE POLICY events_delete_policy ON events
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLES TABLE RLS (Physical tables at events)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS tables_user_policy ON tables;
DROP POLICY IF EXISTS tables_select_policy ON tables;
DROP POLICY IF EXISTS tables_insert_policy ON tables;
DROP POLICY IF EXISTS tables_update_policy ON tables;
DROP POLICY IF EXISTS tables_delete_policy ON tables;

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view tables for their events
CREATE POLICY tables_select_policy ON tables
  FOR SELECT
  USING (auth.owns_event(event_id));

-- INSERT: Users can create tables for their events
CREATE POLICY tables_insert_policy ON tables
  FOR INSERT
  WITH CHECK (auth.owns_event(event_id));

-- UPDATE: Users can update tables for their events
CREATE POLICY tables_update_policy ON tables
  FOR UPDATE
  USING (auth.owns_event(event_id))
  WITH CHECK (auth.owns_event(event_id));

-- DELETE: Users can delete tables for their events
CREATE POLICY tables_delete_policy ON tables
  FOR DELETE
  USING (auth.owns_event(event_id));

-- ============================================================================
-- GUESTS TABLE RLS
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS guests_user_policy ON guests;
DROP POLICY IF EXISTS guests_select_policy ON guests;
DROP POLICY IF EXISTS guests_insert_policy ON guests;
DROP POLICY IF EXISTS guests_update_policy ON guests;
DROP POLICY IF EXISTS guests_delete_policy ON guests;

-- Enable RLS
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view guests for their events
CREATE POLICY guests_select_policy ON guests
  FOR SELECT
  USING (auth.owns_event(event_id));

-- INSERT: Users can create guests for their events
CREATE POLICY guests_insert_policy ON guests
  FOR INSERT
  WITH CHECK (auth.owns_event(event_id));

-- UPDATE: Users can update guests for their events
CREATE POLICY guests_update_policy ON guests
  FOR UPDATE
  USING (auth.owns_event(event_id))
  WITH CHECK (auth.owns_event(event_id));

-- DELETE: Users can delete guests for their events
CREATE POLICY guests_delete_policy ON guests
  FOR DELETE
  USING (auth.owns_event(event_id));

-- ============================================================================
-- SEATING_ASSIGNMENTS TABLE RLS
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS seating_assignments_user_policy ON seating_assignments;
DROP POLICY IF EXISTS seating_assignments_select_policy ON seating_assignments;
DROP POLICY IF EXISTS seating_assignments_insert_policy ON seating_assignments;
DROP POLICY IF EXISTS seating_assignments_update_policy ON seating_assignments;
DROP POLICY IF EXISTS seating_assignments_delete_policy ON seating_assignments;

-- Enable RLS
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view assignments for their events
CREATE POLICY seating_assignments_select_policy ON seating_assignments
  FOR SELECT
  USING (auth.owns_event(event_id));

-- INSERT: Users can create assignments for their events
CREATE POLICY seating_assignments_insert_policy ON seating_assignments
  FOR INSERT
  WITH CHECK (auth.owns_event(event_id));

-- UPDATE: Users can update assignments for their events
CREATE POLICY seating_assignments_update_policy ON seating_assignments
  FOR UPDATE
  USING (auth.owns_event(event_id))
  WITH CHECK (auth.owns_event(event_id));

-- DELETE: Users can delete assignments for their events
CREATE POLICY seating_assignments_delete_policy ON seating_assignments
  FOR DELETE
  USING (auth.owns_event(event_id));

-- ============================================================================
-- GUEST_RELATIONSHIPS TABLE RLS
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS guest_relationships_user_policy ON guest_relationships;
DROP POLICY IF EXISTS guest_relationships_select_policy ON guest_relationships;
DROP POLICY IF EXISTS guest_relationships_insert_policy ON guest_relationships;
DROP POLICY IF EXISTS guest_relationships_update_policy ON guest_relationships;
DROP POLICY IF EXISTS guest_relationships_delete_policy ON guest_relationships;

-- Enable RLS
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view relationships for guests in their events
CREATE POLICY guest_relationships_select_policy ON guest_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest1_id
      AND auth.owns_event(guests.event_id)
    )
  );

-- INSERT: Users can create relationships for guests in their events
CREATE POLICY guest_relationships_insert_policy ON guest_relationships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest1_id
      AND auth.owns_event(guests.event_id)
    )
    AND
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest2_id
      AND auth.owns_event(guests.event_id)
    )
  );

-- UPDATE: Users can update relationships for guests in their events
CREATE POLICY guest_relationships_update_policy ON guest_relationships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest1_id
      AND auth.owns_event(guests.event_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest1_id
      AND auth.owns_event(guests.event_id)
    )
    AND
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest2_id
      AND auth.owns_event(guests.event_id)
    )
  );

-- DELETE: Users can delete relationships for guests in their events
CREATE POLICY guest_relationships_delete_policy ON guest_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.guests
      WHERE guests.id = guest_relationships.guest1_id
      AND auth.owns_event(guests.event_id)
    )
  );

-- ============================================================================
-- SEATING_PLANS TABLE RLS
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS seating_plans_user_policy ON seating_plans;
DROP POLICY IF EXISTS seating_plans_select_policy ON seating_plans;
DROP POLICY IF EXISTS seating_plans_insert_policy ON seating_plans;
DROP POLICY IF EXISTS seating_plans_update_policy ON seating_plans;
DROP POLICY IF EXISTS seating_plans_delete_policy ON seating_plans;

-- Enable RLS
ALTER TABLE seating_plans ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view seating plans for their events
CREATE POLICY seating_plans_select_policy ON seating_plans
  FOR SELECT
  USING (auth.owns_event(event_id));

-- INSERT: Users can create seating plans for their events
CREATE POLICY seating_plans_insert_policy ON seating_plans
  FOR INSERT
  WITH CHECK (auth.owns_event(event_id));

-- UPDATE: Users can update seating plans for their events
CREATE POLICY seating_plans_update_policy ON seating_plans
  FOR UPDATE
  USING (auth.owns_event(event_id))
  WITH CHECK (auth.owns_event(event_id));

-- DELETE: Users can delete seating plans for their events
CREATE POLICY seating_plans_delete_policy ON seating_plans
  FOR DELETE
  USING (auth.owns_event(event_id));

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================
-- These indexes optimize the policy lookups by event_id and user_id

-- Events table: Index on user_id for ownership checks
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- Tables table: Index on event_id for policy lookups
CREATE INDEX IF NOT EXISTS idx_tables_event_id ON tables(event_id);

-- Guests table: Index on event_id for policy lookups
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);

-- Seating assignments table: Index on event_id for policy lookups
CREATE INDEX IF NOT EXISTS idx_seating_assignments_event_id ON seating_assignments(event_id);

-- Guest relationships: Composite index for both guest lookups
CREATE INDEX IF NOT EXISTS idx_guest_relationships_guest1_id ON guest_relationships(guest1_id);
CREATE INDEX IF NOT EXISTS idx_guest_relationships_guest2_id ON guest_relationships(guest2_id);

-- Seating plans: Index on event_id for policy lookups
CREATE INDEX IF NOT EXISTS idx_seating_plans_event_id ON seating_plans(event_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant authenticated users access to tables (RLS will filter rows)

GRANT SELECT, INSERT, UPDATE, DELETE ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seating_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON seating_plans TO authenticated;

-- Grant usage on sequences for auto-increment IDs
GRANT USAGE, SELECT ON SEQUENCE events_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tables_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE guests_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE seating_assignments_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE guest_relationships_id_seq TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auth.owns_event IS 'Helper function to check if authenticated user owns an event. Used by RLS policies.';

COMMENT ON POLICY events_select_policy ON events IS 'Users can only view their own events';
COMMENT ON POLICY events_insert_policy ON events IS 'Users can only create events for themselves';
COMMENT ON POLICY events_update_policy ON events IS 'Users can only update their own events';
COMMENT ON POLICY events_delete_policy ON events IS 'Users can only delete their own events';

COMMENT ON POLICY tables_select_policy ON tables IS 'Users can only view tables for events they own';
COMMENT ON POLICY tables_insert_policy ON tables IS 'Users can only create tables for events they own';
COMMENT ON POLICY tables_update_policy ON tables IS 'Users can only update tables for events they own';
COMMENT ON POLICY tables_delete_policy ON tables IS 'Users can only delete tables for events they own';

COMMENT ON POLICY guests_select_policy ON guests IS 'Users can only view guests for events they own';
COMMENT ON POLICY guests_insert_policy ON guests IS 'Users can only create guests for events they own';
COMMENT ON POLICY guests_update_policy ON guests IS 'Users can only update guests for events they own';
COMMENT ON POLICY guests_delete_policy ON guests IS 'Users can only delete guests for events they own';

-- ============================================================================
-- VALIDATION QUERIES (For Testing)
-- ============================================================================
-- Run these queries after migration to verify RLS is working correctly

-- 1. Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- 2. List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- 3. Test policy performance (explain analyze)
-- EXPLAIN ANALYZE SELECT * FROM events WHERE user_id = auth.uid();

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
-- To rollback this migration:
/*
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_plans DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS auth.owns_event(INTEGER);
*/
