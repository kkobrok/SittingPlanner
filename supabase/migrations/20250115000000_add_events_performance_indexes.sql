-- Migration: Add Performance Indexes for Events Table
-- Created: 2025-01-15
-- Purpose: Optimize query performance for the List Events endpoint
--
-- This migration adds indexes to support:
-- 1. User filtering (RLS enforcement)
-- 2. Sorting by created_at, updated_at, date, and name
-- 3. Full-text search on event names
-- 4. Efficient pagination

-- ============================================================================
-- Index 1: User ID Filter (likely exists from table creation, but ensure it)
-- ============================================================================
-- Purpose: Optimize WHERE user_id = ? queries (RLS enforcement)
-- Used in: All event queries
CREATE INDEX IF NOT EXISTS idx_events_user_id
ON events(user_id);

-- ============================================================================
-- Index 2: Created At Sorting (Default Sort Field)
-- ============================================================================
-- Purpose: Optimize ORDER BY created_at DESC queries
-- Used in: Default sorting for list events
CREATE INDEX IF NOT EXISTS idx_events_created_at
ON events(created_at DESC);

-- ============================================================================
-- Index 3: Updated At Sorting
-- ============================================================================
-- Purpose: Optimize ORDER BY updated_at queries
-- Used in: Sorting by most recently updated events
CREATE INDEX IF NOT EXISTS idx_events_updated_at
ON events(updated_at DESC);

-- ============================================================================
-- Index 4: Date Sorting
-- ============================================================================
-- Purpose: Optimize ORDER BY date queries
-- Used in: Sorting events by their actual event date
CREATE INDEX IF NOT EXISTS idx_events_date
ON events(date DESC);

-- ============================================================================
-- Index 5: Name Sorting
-- ============================================================================
-- Purpose: Optimize ORDER BY name queries
-- Used in: Alphabetical sorting of events
CREATE INDEX IF NOT EXISTS idx_events_name
ON events(name);

-- ============================================================================
-- Index 6: Composite Index for Optimized Pagination
-- ============================================================================
-- Purpose: Optimize the most common query pattern (filter by user + sort by created_at)
-- Used in: Default list events query with pagination
-- This composite index allows PostgreSQL to efficiently filter and sort in one operation
CREATE INDEX IF NOT EXISTS idx_events_user_created
ON events(user_id, created_at DESC);

-- ============================================================================
-- Index 7: Composite Index for User + Date Sorting
-- ============================================================================
-- Purpose: Optimize user filter + date sorting combination
-- Used in: When users sort their events by event date
CREATE INDEX IF NOT EXISTS idx_events_user_date
ON events(user_id, date DESC);

-- ============================================================================
-- Index 8: Full-Text Search on Name
-- ============================================================================
-- Purpose: Optimize ILIKE '%search%' queries on event names
-- Uses PostgreSQL's trigram extension for efficient partial text matching
-- Required for: Search functionality

-- Enable the pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for trigram matching on event names
-- This dramatically improves performance for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_events_name_search
ON events USING GIN (name gin_trgm_ops);

-- ============================================================================
-- Performance Analysis Commands (for reference, not executed)
-- ============================================================================
-- Run these commands to verify index usage:
--
-- EXPLAIN ANALYZE
-- SELECT * FROM events
-- WHERE user_id = 'some-uuid'
-- ORDER BY created_at DESC
-- LIMIT 20 OFFSET 0;
--
-- Expected: Should use idx_events_user_created or idx_events_user_id + idx_events_created_at
--
-- EXPLAIN ANALYZE
-- SELECT * FROM events
-- WHERE user_id = 'some-uuid'
-- AND name ILIKE '%wedding%'
-- ORDER BY created_at DESC
-- LIMIT 20;
--
-- Expected: Should use idx_events_name_search for the ILIKE filter

-- ============================================================================
-- Index Maintenance Notes
-- ============================================================================
-- 1. Indexes automatically update when data changes
-- 2. Monitor index usage with:
--    SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
-- 3. Unused indexes can be dropped to save space
-- 4. Consider periodic REINDEX if data changes heavily
-- 5. VACUUM ANALYZE events; helps query planner use indexes efficiently
