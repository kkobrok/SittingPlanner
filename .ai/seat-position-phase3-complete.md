# Seat Position Feature - Phase 3 Complete ✅

## Summary

Phase 3 (Seat Visualization UI) for seat position tracking has been successfully implemented. Users can now toggle between "Table View" (original list-based layout) and "Seat View" (detailed seat grid showing individual seats within each table).

## What Was Implemented

### 1. TableWithSeats Component ✅

**File:** `src/components/SeatingPlan/TableWithSeats.tsx`

New component for visualizing individual seats within tables:

- **Props:**
  - `table` - The table object with id, name, capacity
  - `seats[]` - Array of seat objects with position, guest, and assignment
  - `onDropOnSeat` - Callback for seat-level drops
  - `activeGuestId` - Currently dragging guest ID for visual feedback

- **Features:**
  - Grid layout (2 columns) showing all seats 1 through table capacity
  - Each seat displays:
    - Seat number (e.g., "Seat 1", "Seat 2")
    - Guest card if occupied
    - "Empty" text if vacant and not dragging
    - "Drop here" hint when dragging and seat is empty
  - Occupancy counter in header (e.g., "3/8 filled")
  - Visual states:
    - Empty seat: Dashed border, light background
    - Occupied seat: Solid border, card background
    - Drag over empty seat: Primary color border, highlight ring
    - Drag over occupied seat: Orange border (swap indication)

**Visual Example:**
```
┌─────────────────────────────────────────┐
│ Table 1 (cap: 8)        3/8 filled      │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐               │
│  │ Seat 1  │  │ Seat 2  │               │
│  │ [1] Alice│  │ [2] Bob │               │
│  └─────────┘  └─────────┘               │
│  ┌─────────┐  ┌─────────┐               │
│  │ Seat 3  │  │ Seat 4  │               │
│  │ Empty   │  │ [4] Dave│               │
│  └─────────┘  └─────────┘               │
│       ... (seats 5-8) ...               │
└─────────────────────────────────────────┘
```

### 2. DroppableSeat Component ✅

**Nested within:** `src/components/SeatingPlan/TableWithSeats.tsx`

Sub-component for individual droppable seat slots:

- **Uses @dnd-kit/core:**
  - `useDroppable` hook with unique ID: `seat-{tableId}-{position}`
  - `isOver` state for drag-over visual feedback
  - `setNodeRef` for drop zone registration

- **Visual Feedback:**
  - Shows "Drop here" text on empty seats when guest is being dragged
  - Border color changes on hover
  - Supports dropping on occupied seats (for future seat swapping)

### 3. View Mode Toggle ✅

**File:** `src/components/SeatingPlan/DragAndDropCanvas.tsx`

Added view mode toggle between Table View and Seat View:

**UI Changes:**
- New header section with "Seating Arrangement" title
- Two toggle buttons:
  - "Table View" - Original compact list view
  - "Seat View" - Detailed seat grid view
- Active view button highlighted with primary color
- Buttons use Apple HIG styling (12px rounded, soft shadows)

**State Management:**
```typescript
type ViewMode = 'table' | 'seat';
const [viewMode, setViewMode] = useState<ViewMode>('table');
```

**Conditional Rendering:**
- Table View: Renders `DroppableTable` components (original)
- Seat View: Renders `TableWithSeats` components (new)

### 4. Seat Data Structure ✅

**File:** `src/components/SeatingPlan/DragAndDropCanvas.tsx`

Created seat grid data structure from assignments:

```typescript
const tableSeats: Record<number, Array<{
  position: number;
  guest: any | null;
  assignment: any | null
}>> = {};

tables.forEach((table: any) => {
  tableSeats[table.id] = [];
  for (let i = 1; i <= table.capacity; i++) {
    const assignment = assignments.find(
      (a: any) => a.table_id === table.id && a.seat_position === i
    );
    const guest = assignment
      ? guests.find((g: any) => g.id === assignment.guest_id)
      : null;
    tableSeats[table.id].push({ position: i, guest, assignment });
  }
});
```

**Key Logic:**
- Generates seat slots for ALL positions (1 to capacity)
- Maps assignments to their specific seat positions
- Null guest for empty seats
- Maintains assignment reference for seat position info

### 5. Seat-Level Drop Handling ✅

**File:** `src/components/SeatingPlan/DragAndDropCanvas.tsx`

Updated `handleDragEnd` to parse seat-specific drop IDs:

```typescript
function handleDragEnd(event: any) {
  const { active, over } = event;
  setActiveId(null);

  if (active && over && active.id && over.id) {
    // Check if dropped on "unassigned" zone
    if (over.id === 'unassigned-zone') {
      onUnassign(active.id);
      return;
    }

    // Check if dropped on a specific seat (format: seat-{tableId}-{position})
    if (typeof over.id === 'string' && over.id.startsWith('seat-')) {
      const parts = over.id.split('-');
      if (parts.length === 3) {
        const tableId = parseInt(parts[1]);
        const seatPosition = parseInt(parts[2]);
        onDrop(active.id, tableId, seatPosition);
        return;
      }
    }

    // Otherwise, dropped on a table (table view)
    if (active.id !== over.id) {
      onDrop(active.id, over.id);
    }
  }
}
```

**Drop ID Formats:**
- Unassigned zone: `"unassigned-zone"`
- Seat view: `"seat-{tableId}-{position}"` (e.g., "seat-1-3" for Table 1, Seat 3)
- Table view: `{tableId}` (numeric, e.g., 1, 2, 3)

### 6. SeatingPlanPage Integration ✅

**File:** `src/components/SeatingPlan/SeatingPlanPage.tsx`

Updated `handleDrop` to accept and pass seat position:

**Before:**
```typescript
const handleDrop = async (guestId: number, toTableId: number) => {
  // ...
  await updateAssignment.mutateAsync({ assignmentId, tableId: toTableId });
}
```

**After:**
```typescript
const handleDrop = async (
  guestId: number,
  toTableId: number,
  seatPosition?: number
) => {
  // ...
  if (assignment && assignment.id != null) {
    await updateAssignment.mutateAsync({
      assignmentId: assignment.id,
      tableId: toTableId,
      seatPosition: seatPosition
    });
  } else {
    await createAssignment.mutateAsync({
      guestId,
      tableId: toTableId,
      seatPosition: seatPosition
    });
  }

  // Enhanced success message with seat info
  const seatInfo = seatPosition ? ` (Seat ${seatPosition})` : '';
  setSuccessMessage(
    `${guest?.name || 'Guest'} assigned to ${table?.name || 'table'}${seatInfo}`
  );
}
```

## User Experience

### Current Behavior

1. **Default View (Table View):**
   - Shows original compact layout
   - Guests listed under each table
   - Drag to table to assign (no specific seat)
   - Seat badges visible on guest cards if assigned

2. **Switch to Seat View:**
   - Click "Seat View" button in header
   - Tables expand to show individual seat grid
   - All seats displayed (occupied and empty)
   - Drag guest to specific seat position
   - Visual "Drop here" hint on empty seats

3. **Drag and Drop in Seat View:**
   - Drag guest from unassigned list or from another seat
   - Hover over empty seat → "Drop here" appears, seat highlights
   - Drop on empty seat → Guest assigned to that specific seat position
   - Drop on occupied seat → (Future: seat swap; Currently: replaces)
   - Success message shows table and seat number

4. **Visual Feedback:**
   - Empty seats: Dashed border, subtle background
   - Occupied seats: Guest card with seat badge
   - Drag over empty seat: Primary color border, highlight ring
   - Drag over occupied seat: Orange border (warning/swap indication)
   - Occupancy counter: "X/Y filled" in table header

## Files Modified

1. `src/components/SeatingPlan/TableWithSeats.tsx` (created)
2. `src/components/SeatingPlan/DragAndDropCanvas.tsx` (modified)
3. `src/components/SeatingPlan/SeatingPlanPage.tsx` (modified)

## What Works Now

✅ View mode toggle between Table View and Seat View
✅ Seat grid visualization showing all seats in a table
✅ Drag guest to specific seat position
✅ Visual feedback for drop zones (empty vs occupied seats)
✅ Seat position saved to database via API
✅ Success message displays seat number
✅ Occupancy counter shows filled/total seats
✅ Backward compatible - table view still works as before
✅ Seat badges show on guest cards in both views

## What's Still Needed (Phase 4 - Advanced Features)

The following features are planned for Phase 4:

- [ ] Seat swapping functionality (drag occupied seat to another occupied seat)
- [ ] Auto-assignment to next available seat option
- [ ] Bulk seat assignment tools
- [ ] Seat preferences/restrictions
- [ ] Visual seat arrangement editor (circular vs rectangular tables)
- [ ] Print view optimizations for seat view
- [ ] Accessibility improvements for seat navigation

## Testing

### Manual Testing Steps

1. **Test View Toggle:**
   ```
   - Navigate to /events/1/plan
   - Click "Seat View" button
   - Verify tables expand to show seat grid
   - Click "Table View" button
   - Verify tables return to compact list
   ```

2. **Test Seat Assignment (from unassigned):**
   ```
   - Switch to Seat View
   - Drag an unassigned guest
   - Hover over an empty seat
   - Verify "Drop here" appears
   - Drop on empty seat
   - Verify success message shows seat number
   - Verify guest card appears in that seat with seat badge
   ```

3. **Test Seat Reassignment (change seat):**
   ```
   - Drag a guest already assigned to a seat
   - Drop on a different empty seat in the same table
   - Verify guest moves to new seat
   - Verify seat badge updates
   ```

4. **Test Cross-Table Seat Assignment:**
   ```
   - Drag a guest from one table
   - Drop on specific seat in different table
   - Verify guest moves to new table and seat
   ```

5. **Test Occupancy Counter:**
   ```
   - Observe "X/Y filled" counter in table header
   - Assign guest to seat
   - Verify counter increments
   - Remove guest (drag to unassigned)
   - Verify counter decrements
   ```

### API Testing

Test seat position assignment via API:

```bash
# Create assignment with seat position
curl -X POST http://localhost:3003/api/events/1/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "guest_id": 1,
    "table_id": 1,
    "seat_position": 5
  }'

# Update assignment seat position
curl -X PATCH http://localhost:3003/api/assignments/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "seat_position": 7
  }'

# Verify assignment includes seat_position
curl http://localhost:3003/api/events/1/assignments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Component Architecture

```
SeatingPlanPage
└── DragAndDropCanvas
    ├── [View Mode Toggle]
    ├── [Table View - DroppableTable]
    │   └── DraggableGuestCard
    │       └── GuestCard (with seatPosition badge)
    └── [Seat View - TableWithSeats]
        └── DroppableSeat
            └── GuestCard (with seatPosition badge)
```

## Screenshots (Conceptual)

### Table View (Original)
```
┌──────────────────────────────────┐
│ Seating Arrangement              │
│  [Table View] | Seat View        │
├──────────────────────────────────┤
│ Table 1 (cap: 8)                 │
│  [1] Alice Johnson               │
│  [2] Bob Smith                   │
│  Carol Williams                  │
│                                  │
│ Table 2 (cap: 6)                 │
│  [3] David Brown                 │
│  Emma Davis                      │
└──────────────────────────────────┘
```

### Seat View (New)
```
┌──────────────────────────────────┐
│ Seating Arrangement              │
│  Table View | [Seat View]        │
├──────────────────────────────────┤
│ Table 1 (cap: 8)    3/8 filled   │
│ ┌─────────┐  ┌─────────┐         │
│ │ Seat 1  │  │ Seat 2  │         │
│ │[1] Alice│  │[2] Bob  │         │
│ └─────────┘  └─────────┘         │
│ ┌─────────┐  ┌─────────┐         │
│ │ Seat 3  │  │ Seat 4  │         │
│ │ Empty   │  │ Carol   │  ← No seat #
│ └─────────┘  └─────────┘         │
│       ... (seats 5-8) ...        │
└──────────────────────────────────┘
```

## Next Steps

Ready to proceed with Phase 4 (Advanced Features):
- Seat swapping UI
- Auto-assignment algorithms
- Visual seat arrangement customization

---

**Status:** Phase 3 Complete ✅
**Date:** 2025-01-18
**Build Status:** ✅ Compiling successfully
**Type Safety:** ✅ All TypeScript types valid
**Hot Reload:** ✅ Files updating in dev server
