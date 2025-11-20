-- Disable RLS for local development
-- This allows authentication bypass to work properly
-- In production, RLS should be re-enabled with proper policies

ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE seating_plans DISABLE ROW LEVEL SECURITY;
