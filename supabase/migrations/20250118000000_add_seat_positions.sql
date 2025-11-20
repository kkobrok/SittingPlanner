-- Add Seat Position Support to Seating Assignments
-- Created: 2025-01-18
-- Purpose: Enable tracking of specific seat positions within tables

-- ============================================================================
-- ADD SEAT_POSITION COLUMN
-- ============================================================================

-- Add seat_position column to seating_assignments (nullable for backward compatibility)
ALTER TABLE seating_assignments
ADD COLUMN seat_position INTEGER;

-- Add constraint: seat_position must be positive if provided
ALTER TABLE seating_assignments
ADD CONSTRAINT seat_position_positive
CHECK (seat_position IS NULL OR seat_position > 0);

-- Add unique constraint: one guest per seat position at a table
-- This prevents double-booking of seats
ALTER TABLE seating_assignments
ADD CONSTRAINT unique_seat_per_table
UNIQUE(table_id, seat_position);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add index for efficient seat lookups
-- Partial index only on rows where seat_position is specified
CREATE INDEX idx_seating_assignments_seat_position
ON seating_assignments(table_id, seat_position)
WHERE seat_position IS NOT NULL;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN seating_assignments.seat_position IS
'Specific seat position at the table (1 to table.capacity). NULL means assigned to table but no specific seat.';
