-- Verify seat_position column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'seating_assignments'
  AND column_name = 'seat_position';

-- Check constraints
SELECT
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'seating_assignments'
  AND (tc.constraint_name LIKE '%seat%' OR tc.constraint_name = 'unique_seat_per_table');

-- Check indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'seating_assignments'
  AND indexname LIKE '%seat%';

-- View sample data structure
SELECT id, guest_id, table_id, seat_position
FROM seating_assignments
LIMIT 5;
