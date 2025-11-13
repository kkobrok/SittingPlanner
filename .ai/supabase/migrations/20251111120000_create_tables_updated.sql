
-- 20251111120000_create_tables_updated.sql
-- Purpose: Create initial tables for the EasyWedding Seating Planner app
-- Affected tables: events, guests, guest_relationships, tables, seating_assignments
-- Special considerations: Enables Row Level Security (RLS) on all tables

-- Create events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security for events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for events table
CREATE POLICY events_user_policy ON events 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create guests table
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  name VARCHAR(255) NOT NULL,
  age_range VARCHAR(50),
  drinking_habits VARCHAR(50),
  dietary_restrictions VARCHAR(255),
  hobbies_interests VARCHAR(255),
  topics_to_avoid VARCHAR(255)
);

-- Enable RLS for guests table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for guests table
CREATE POLICY guests_user_policy ON guests 
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

-- Create guest_relationships table
CREATE TABLE guest_relationships (
  id SERIAL PRIMARY KEY,
  guest1_id INTEGER NOT NULL REFERENCES guests(id),
  guest2_id INTEGER NOT NULL REFERENCES guests(id),
  relationship_type VARCHAR(50) NOT NULL,
  strength INTEGER
);

-- Enable RLS for guest_relationships table
ALTER TABLE guest_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for guest_relationships table
CREATE POLICY guest_relationships_user_policy ON guest_relationships 
  USING (guest1_id IN (SELECT id FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id = auth.uid())) 
         AND guest2_id IN (SELECT id FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id = auth.uid())))
  WITH CHECK (guest1_id IN (SELECT id FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id = auth.uid())) 
              AND guest2_id IN (SELECT id FROM guests WHERE event_id IN (SELECT id FROM events WHERE user_id = auth.uid())));

-- Create tables table
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL
);

-- Enable RLS for tables table  
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tables table
CREATE POLICY tables_user_policy ON tables
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

-- Create seating_assignments table  
CREATE TABLE seating_assignments (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  guest_id INTEGER NOT NULL REFERENCES guests(id),
  table_id INTEGER NOT NULL REFERENCES tables(id)  
);

-- Enable RLS for seating_assignments table
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for seating_assignments table
CREATE POLICY seating_assignments_user_policy ON seating_assignments 
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid())) 
  WITH CHECK (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));  

-- Create indexes
CREATE INDEX ON events (user_id);
CREATE INDEX ON guests (event_id);
CREATE INDEX ON guest_relationships (guest1_id, guest2_id);
CREATE INDEX ON tables (event_id);
CREATE INDEX ON seating_assignments (event_id, guest_id, table_id);
