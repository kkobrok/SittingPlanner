-- Migration: Add table_type column to tables
-- Date: 2025-01-18
-- Description: Add table_type field to store table shape/type (round, rectangle, square, oval, u_shape, banquet, wave)

-- Add table_type column with default value
ALTER TABLE tables
ADD COLUMN table_type VARCHAR(50) NOT NULL DEFAULT 'rectangle';

-- Add comment for documentation
COMMENT ON COLUMN tables.table_type IS 'Type/shape of the table: round, rectangle, square, oval, u_shape, banquet, wave';

-- Optional: Add check constraint to ensure valid table types
ALTER TABLE tables
ADD CONSTRAINT valid_table_type CHECK (
  table_type IN ('round', 'rectangle', 'square', 'oval', 'u_shape', 'banquet', 'wave')
);

-- Create index for table_type queries (optional, for performance)
CREATE INDEX idx_tables_table_type ON tables(table_type);
