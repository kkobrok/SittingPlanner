# Seat Position Feature - Phase 1 Complete ✅

## Summary

Phase 1 (Database & API Backend) for seat position tracking has been successfully implemented.

## What Was Implemented

### 1. Database Migration ✅

**File:** `supabase/migrations/20250118000000_add_seat_positions.sql`

- Added `seat_position` column to `seating_assignments` table
- Column type: INTEGER (nullable for backward compatibility)
- Constraint: `seat_position_positive` - ensures value is positive if provided
- Constraint: `unique_seat_per_table` - prevents duplicate seat assignments
- Index: `idx_seating_assignments_seat_position` - optimizes seat queries
- Migration applied successfully via `supabase db reset`

### 2. TypeScript Database Types ✅

**File:** `src/db/database.types.ts`

- Auto-generated types include `seat_position: number | null`
- Types updated for Row, Insert, and Update operations
- Full type safety for seat position throughout the application

### 3. API Validators ✅

**File:** `src/validators/assignments.validator.ts`

Updated schemas:
- `CreateAssignmentSchema` - accepts optional `seat_position`
- `UpdateAssignmentSchema` - accepts optional `seat_position` and made `table_id` optional
- Validation ensures seat_position is a positive integer or null

### 4. Assignment Service Layer ✅

**File:** `src/services/assignments.service.ts`

Updated `createAssignment` method:
- Validates seat_position is within table capacity
- Checks if seat is already taken by another guest
- Throws `SEAT_EXCEEDS_CAPACITY:{capacity}` if seat number too high
- Throws `SEAT_ALREADY_TAKEN` if seat occupied
- Includes seat_position in database queries

Updated `listAssignmentsForEvent` method:
- Now includes `seat_position` in SELECT query

### 5. Assignment API Endpoints ✅

**File:** `src/pages/api/events/[id]/assignments.ts`

POST endpoint:
- Accepts `seat_position` in request body
- Error handling for `SEAT_EXCEEDS_CAPACITY` (400)
- Error handling for `SEAT_ALREADY_TAKEN` (409)

**File:** `src/pages/api/assignments/[id].ts`

PATCH endpoint:
- Accepts `seat_position` in request body
- Validates seat_position is within table capacity
- Checks if seat is already taken
- Allows updating to null (remove seat assignment)
- Returns appropriate error codes

### 6. Frontend Hooks ✅

**File:** `src/lib/hooks/assignmentMutations.ts`

Updated mutations:
- `createAssignment` - accepts optional `seatPosition` parameter
- `updateAssignment` - accepts optional `seatPosition` parameter
- Both mutations properly construct request body with seat_position

## API Response Changes

### Before (without seat position):
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 1
}
```

### After (with seat position support):
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 1,
  "seat_position": 3
}
```

## Backward Compatibility

✅ **Fully backward compatible**

- Existing assignments have `seat_position = null`
- New assignments can be created without specifying seat
- Frontend will continue to work without modifications
- Seat positions are optional at all levels

## Error Codes

New error codes added:

| Code | HTTP Status | Message |
|------|-------------|---------|
| `seat_exceeds_capacity` | 400 | Seat position exceeds table capacity of {N} |
| `seat_already_taken` | 409 | This seat is already occupied by another guest |

## Testing

Test scenarios documented in:
- `test-seat-position.md` - API testing guide
- `scripts/verify-seat-position-schema.sql` - Database verification queries

## Files Modified

1. `supabase/migrations/20250118000000_add_seat_positions.sql` (new)
2. `src/db/database.types.ts` (regenerated)
3. `src/validators/assignments.validator.ts` (updated)
4. `src/services/assignments.service.ts` (updated)
5. `src/pages/api/events/[id]/assignments.ts` (updated)
6. `src/pages/api/assignments/[id].ts` (updated)
7. `src/lib/hooks/assignmentMutations.ts` (updated)

## Next Steps (Phase 2 & 3)

Phase 2: Basic Frontend Support
- [ ] Update SeatingPlanPage to pass seat_position in drag handlers
- [ ] Display seat numbers on guest cards
- [ ] Test seat assignment via UI

Phase 3: Seat Visualization
- [ ] Create TableWithSeats component
- [ ] Add seat grid/list view
- [ ] Add droppable seat zones
- [ ] Add mode toggle (table view vs seat view)
- [ ] Visual feedback for seat availability

## How to Use (Examples)

### Create assignment with specific seat:
```typescript
createAssignment.mutate({
  guestId: 1,
  tableId: 1,
  seatPosition: 3
});
```

### Create assignment without specific seat (backward compatible):
```typescript
createAssignment.mutate({
  guestId: 1,
  tableId: 1
});
```

### Update guest to different seat:
```typescript
updateAssignment.mutate({
  assignmentId: 1,
  seatPosition: 5
});
```

### Remove seat assignment (keep at table):
```typescript
updateAssignment.mutate({
  assignmentId: 1,
  seatPosition: null
});
```

---

**Status:** Phase 1 Complete ✅
**Date:** 2025-01-18
**Estimated Time:** 4-6 hours (as planned)
