-- Seed data for local development
-- This file creates test data for the test user
-- User ID: e98fe906-d4e5-4151-b470-c1b1b2418723 (testuser@example.com)

-- Insert a test event
INSERT INTO events (id, name, date, location, description, user_id, created_at, updated_at)
VALUES (
  1,
  'Test Wedding Event',
  '2025-06-15',
  'Grand Hotel Ballroom',
  'A beautiful wedding celebration with friends and family',
  'e98fe906-d4e5-4151-b470-c1b1b2418723',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert some test tables for the event
INSERT INTO tables (id, event_id, name, capacity, created_at, updated_at)
VALUES
  (1, 1, 'Table 1', 8, NOW(), NOW()),
  (2, 1, 'Table 2', 8, NOW(), NOW()),
  (3, 1, 'Table 3', 6, NOW(), NOW()),
  (4, 1, 'VIP Table', 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some test guests
INSERT INTO guests (id, event_id, name, age_range, hobbies_interests, dietary_restrictions, topics_to_avoid, drinking_habits, created_at, updated_at)
VALUES
  (1, 1, 'Alice Johnson', '25-30', 'Photography, hiking', 'Vegetarian', '', 'Moderate', NOW(), NOW()),
  (2, 1, 'Bob Smith', '30-40', 'Sports, cooking', '', 'Politics', 'None', NOW(), NOW()),
  (3, 1, 'Carol Williams', '40-50', 'Reading, gardening', 'Gluten-free', '', 'Moderate', NOW(), NOW()),
  (4, 1, 'David Brown', '30-40', 'Music, traveling', '', '', 'Social', NOW(), NOW()),
  (5, 1, 'Emma Davis', '20-30', 'Art, yoga', 'Vegan', 'Religion', 'Moderate', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequences to avoid duplicate key errors
SELECT setval('events_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM events), false);
SELECT setval('tables_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM tables), false);
SELECT setval('guests_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM guests), false);
SELECT setval('seating_assignments_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM seating_assignments), false);
SELECT setval('guest_relationships_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM guest_relationships), false);
