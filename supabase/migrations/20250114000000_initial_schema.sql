-- Initial Database Schema
-- Created: 2025-01-14
-- Purpose: Create base tables for the Sitting Planner application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  location VARCHAR(500),
  description TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own events
CREATE POLICY events_user_policy ON events
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- TABLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see tables for their events
CREATE POLICY tables_user_policy ON tables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tables.event_id
      AND events.user_id = auth.uid()
    )
  );

-- ============================================================================
-- GUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age_range VARCHAR(50),
  hobbies_interests TEXT,
  dietary_restrictions TEXT,
  topics_to_avoid TEXT,
  drinking_habits VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see guests for their events
CREATE POLICY guests_user_policy ON guests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = guests.event_id
      AND events.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEATING_ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS seating_assignments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guest_id, event_id) -- A guest can only be assigned to one table per event
);

-- Add Row Level Security (RLS)
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see seating assignments for their events
CREATE POLICY seating_assignments_user_policy ON seating_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = seating_assignments.event_id
      AND events.user_id = auth.uid()
    )
  );

-- ============================================================================
-- GUEST_RELATIONSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS guest_relationships (
  id SERIAL PRIMARY KEY,
  guest1_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  guest2_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'friend', 'family', 'conflict', etc.
  strength INTEGER CHECK (strength BETWEEN 1 AND 10), -- 1 = weak, 10 = strong
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guest1_id, guest2_id),
  CHECK (guest1_id < guest2_id) -- Ensure consistent ordering to prevent duplicates
);

-- Add Row Level Security (RLS)
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see relationships for their guests
CREATE POLICY guest_relationships_user_policy ON guest_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM guests g1
      JOIN events e ON e.id = g1.event_id
      WHERE g1.id = guest_relationships.guest1_id
      AND e.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEATING_PLANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS seating_plans (
  id VARCHAR(255) PRIMARY KEY, -- e.g., 'current-event-1'
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  plan JSONB NOT NULL, -- Stores the complete seating plan
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Row Level Security (RLS)
ALTER TABLE seating_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see seating plans for their events
CREATE POLICY seating_plans_user_policy ON seating_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = seating_plans.event_id
      AND events.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seating_assignments_updated_at
  BEFORE UPDATE ON seating_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guest_relationships_updated_at
  BEFORE UPDATE ON guest_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seating_plans_updated_at
  BEFORE UPDATE ON seating_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
