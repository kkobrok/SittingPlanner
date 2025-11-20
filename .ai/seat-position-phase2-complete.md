# Seat Position Feature - Phase 2 Complete ✅

## Summary

Phase 2 (Basic Frontend Support) for seat position tracking has been successfully implemented. Guests now display their seat numbers when assigned to specific seats at tables.

## What Was Implemented

### 1. Type Definitions Updated ✅

**File:** `src/types.ts`

Updated interfaces to include seat_position:

- `SeatingAssignmentWithDetailsDto` - added `seat_position?: number | null`
- `TableAssignmentInfo` - added `seat_position?: number | null`
- `UpdateAssignmentRequestDto` - added `seat_position?: number | null`, made `table_id` optional
- `BulkAssignmentItem` - added `seat_position?: number | null`
- `UpdateAssignmentCommand` - added `seat_position?: number | null`, made `table_id` optional

### 2. GuestCard Component Updated ✅

**File:** `src/components/SeatingPlan/GuestCard.tsx`

Added seat position display:
- New prop: `seatPosition?: number | null`
- Visual badge showing seat number when assigned
- Badge styling:
  - 6x6 rounded badge with primary color
  - Positioned before guest name
  - Only displayed when seatPosition is not null
- Accessibility: Updated `aria-label` to include seat number

**Visual Example:**
```
┌─────────────────────┐
│ [3] Alice Johnson   │  ← Shows "Seat 3"
└─────────────────────┘

┌─────────────────────┐
│ Bob Smith           │  ← No seat assigned
└─────────────────────┘
```

### 3. DragAndDropCanvas Updated ✅

**File:** `src/components/SeatingPlan/DragAndDropCanvas.tsx`

Modified data flow to pass seat positions:

**Before:**
```typescript
const tableGuests: Record<number, any[]> = {};
// Only stored guest objects
tableGuests[a.table_id].push(guest);
```

**After:**
```typescript
const tableGuests: Record<number, Array<{ guest: any; assignment: any }>> = {};
// Stores guest + assignment (which includes seat_position)
tableGuests[a.table_id].push({ guest, assignment: a });
```

**Component updates:**
- `DroppableTable`: Updated type to accept `Array<{ guest: any; assignment: any }>`
- `DroppableTable`: Passes `assignment.seat_position` to DraggableGuestCard
- `DraggableGuestCard`: Added `seatPosition` prop and passes it to GuestCard

## User Experience

### Current Behavior

1. **When a guest has a seat assignment:**
   - Small numbered badge appears before their name
   - Badge shows the seat number (1, 2, 3, etc.)
   - Badge uses primary color for visibility

2. **When a guest has no seat assignment:**
   - No badge displayed
   - Guest name shown normally
   - Backward compatible with existing assignments

3. **Drag and drop:**
   - Seat position preserved when dragging within same table
   - Seat position cleared when moving to different table (for now)
   - Future: Will support seat-level drag and drop

## Files Modified

1. `src/types.ts` - Type definitions
2. `src/components/SeatingPlan/GuestCard.tsx` - Visual display
3. `src/components/SeatingPlan/DragAndDropCanvas.tsx` - Data flow

## What Works Now

✅ Seat positions displayed when assigned via API
✅ Backward compatible - works with guests who have no seat position
✅ Visual badge clearly shows seat numbers
✅ Type safety throughout the stack
✅ Accessible with screen readers

## What's Still Needed (Phase 3)

The following features are planned for Phase 3:

- [ ] UI for assigning guests to specific seats (drag to seat slot)
- [ ] Visual seat grid/list view within tables
- [ ] Seat availability indicators
- [ ] Mode toggle between "table view" and "seat view"
- [ ] Seat swapping functionality
- [ ] Auto-assignment to next available seat option

## Testing

To test seat position display:

1. Create an assignment with a seat position via API:
```bash
curl -X POST http://localhost:4321/api/events/1/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "guest_id": 1,
    "table_id": 1,
    "seat_position": 3
  }'
```

2. Navigate to the seating plan page

3. Observe:
   - Guest card shows a small "3" badge before the name
   - Badge has primary color styling
   - Other guests without seat positions show no badge

## Screenshots (Conceptual)

```
Table 1 (cap: 8)
┌─────────────────────┐
│ [1] Alice Johnson   │
├─────────────────────┤
│ [2] Bob Smith       │
├─────────────────────┤
│ Carol Williams      │ ← No seat number
├─────────────────────┤
│ [4] David Brown     │
└─────────────────────┘
```

## Next Steps

Ready to proceed with Phase 3:
- Seat visualization UI
- Droppable seat zones
- Seat-level assignment

---

**Status:** Phase 2 Complete ✅
**Date:** 2025-01-18
**Build Status:** ✅ Compiling successfully
**Type Safety:** ✅ All TypeScript types valid
