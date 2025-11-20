# Seat Position Implementation Plan

## Overview
Add the ability to track specific seat positions within tables, allowing guests to be assigned not just to a table but to a specific seat/position at that table.

---

## 1. Database Schema Changes

### Migration: Add `seat_position` Column

**File:** `supabase/migrations/20250118000000_add_seat_positions.sql`

```sql
-- Add seat_position column to seating_assignments
ALTER TABLE seating_assignments
ADD COLUMN seat_position INTEGER;

-- Add constraint: seat_position must be positive if provided
ALTER TABLE seating_assignments
ADD CONSTRAINT seat_position_positive
CHECK (seat_position IS NULL OR seat_position > 0);

-- Update unique constraint to allow multiple guests per event (at different tables/seats)
-- Keep existing constraint for backward compatibility
-- Add new constraint: one guest per seat position at a table
ALTER TABLE seating_assignments
ADD CONSTRAINT unique_seat_per_table
UNIQUE(table_id, seat_position);

-- Add index for performance
CREATE INDEX idx_seating_assignments_seat_position
ON seating_assignments(table_id, seat_position)
WHERE seat_position IS NOT NULL;

-- Add comment
COMMENT ON COLUMN seating_assignments.seat_position IS
'Specific seat position at the table (1 to table.capacity). NULL means assigned to table but no specific seat.';
```

### Design Decisions

**seat_position field:**
- Type: `INTEGER`
- Nullable: `YES` (allows backward compatibility - assigned to table but no specific seat)
- Range: 1 to `table.capacity`
- Constraint: `UNIQUE(table_id, seat_position)` - each seat can only have one guest

**Positioning scheme options:**
1. **Simple numbering** (1, 2, 3, ..., capacity) - RECOMMENDED
   - Easy to implement
   - Works for any table shape
   - Position order can be interpreted visually

2. **Angular positioning** (0°, 45°, 90°, etc.)
   - Better for circular tables
   - More complex to implement

3. **Coordinate-based** (x, y)
   - Most flexible
   - Overkill for this use case

**Recommendation:** Use simple numbering (1-N) for initial implementation.

---

## 2. Database Type Updates

### File: `src/db/database.types.ts`

Update the `seating_assignments` table type:

```typescript
seating_assignments: {
  Row: {
    event_id: number;
    guest_id: number;
    id: number;
    table_id: number;
    seat_position: number | null;  // ADD THIS
  };
  Insert: {
    event_id: number;
    guest_id: number;
    id?: number;
    table_id: number;
    seat_position?: number | null;  // ADD THIS
  };
  Update: {
    event_id?: number;
    guest_id?: number;
    id?: number;
    table_id?: number;
    seat_position?: number | null;  // ADD THIS
  };
  // ... relationships remain the same
}
```

---

## 3. API Validator Updates

### File: `src/validators/assignments.validator.ts`

```typescript
import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  guest_id: z.number().int().positive(),
  table_id: z.number().int().positive(),
  seat_position: z.number().int().positive().optional().nullable(), // ADD THIS
});

export const UpdateAssignmentSchema = z.object({
  table_id: z.number().int().positive().optional(),
  seat_position: z.number().int().positive().optional().nullable(), // ADD THIS
});

// NEW: Validation for swapping seats
export const SwapSeatsSchema = z.object({
  assignment1_id: z.number().int().positive(),
  assignment2_id: z.number().int().positive(),
});
```

---

## 4. API Endpoint Updates

### A. POST `/api/events/{id}/assignments`

**Changes:**
- Accept optional `seat_position` in request body
- Validate seat_position is within table capacity
- Check seat_position is not already taken at that table
- Return assignment with seat_position

**Validation logic:**
```typescript
if (validatedData.seat_position) {
  // Check seat_position is within table capacity
  if (validatedData.seat_position > table.capacity) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: `Seat position ${validatedData.seat_position} exceeds table capacity of ${table.capacity}`,
        code: "seat_position_exceeds_capacity",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check seat is not already taken
  const { data: existingSeat } = await supabase
    .from("seating_assignments")
    .select("id")
    .eq("table_id", validatedData.table_id)
    .eq("seat_position", validatedData.seat_position)
    .single();

  if (existingSeat) {
    return new Response(
      JSON.stringify({
        error: "Conflict",
        message: `Seat ${validatedData.seat_position} at this table is already taken`,
        code: "seat_already_taken",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### B. PATCH `/api/assignments/{id}`

**Changes:**
- Accept optional `seat_position` in request body
- When changing `table_id`, validate new seat_position against new table
- Validate seat is not taken at target table

### C. NEW: POST `/api/assignments/swap`

**Purpose:** Swap two guests' seat positions (or one guest's position with an empty seat)

**Request body:**
```json
{
  "assignment1_id": 123,
  "assignment2_id": 456  // Can be null to move to empty seat
}
```

**Logic:**
- Validate both assignments exist and belong to same event
- Validate both assignments are at the same table (can only swap within a table)
- Swap their seat_position values
- Return both updated assignments

---

## 5. Frontend Hook Updates

### File: `src/lib/hooks/assignmentMutations.ts`

```typescript
// Update mutation types
const createAssignment = useMutation({
  mutationFn: async ({
    guestId,
    tableId,
    seatPosition
  }: {
    guestId: number;
    tableId: number;
    seatPosition?: number | null;  // ADD THIS
  }) => {
    const res = await fetch(`/api/events/${eventId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest_id: guestId,
        table_id: tableId,
        seat_position: seatPosition  // ADD THIS
      }),
    });
    if (!res.ok) throw new Error("Failed to create assignment");
    return res.json();
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
});

const updateAssignment = useMutation({
  mutationFn: async ({
    assignmentId,
    tableId,
    seatPosition
  }: {
    assignmentId: number;
    tableId?: number;
    seatPosition?: number | null;  // ADD THIS
  }) => {
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table_id: tableId,
        seat_position: seatPosition  // ADD THIS
      }),
    });
    if (!res.ok) throw new Error("Failed to update assignment");
    return res.json();
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
});

// NEW: Swap seats mutation
const swapSeats = useMutation({
  mutationFn: async ({
    assignment1Id,
    assignment2Id
  }: {
    assignment1Id: number;
    assignment2Id: number;
  }) => {
    const res = await fetch(`/api/assignments/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment1_id: assignment1Id,
        assignment2_id: assignment2Id
      }),
    });
    if (!res.ok) throw new Error("Failed to swap seats");
    return res.json();
  },
  onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
});

return { updateAssignment, createAssignment, deleteAssignment, swapSeats };
```

---

## 6. UI/UX Design

### A. Table Visualization

**Option 1: List View with Seat Numbers** (Simple - Phase 1)
```
┌─────────────────────────────┐
│ Table 1 (Capacity: 6)       │
├─────────────────────────────┤
│ Seat 1: Alice Johnson       │
│ Seat 2: Bob Smith           │
│ Seat 3: [Empty]             │
│ Seat 4: Carol Williams      │
│ Seat 5: [Empty]             │
│ Seat 6: David Brown         │
└─────────────────────────────┘
```

**Option 2: Circular Table View** (Advanced - Phase 2)
```
        ┌───────┐
    ┌───┤ Seat 1│
    │   └───────┘
┌───┤              ┌───┐
│ 6 │   Table 1    │ 2 │
└───┤              └───┘
    │   ┌───────┐
    └───┤ Seat 5│
        └───────┘
```

### B. Drag and Drop Modes

**Mode 1: Table-level assignment** (Current)
- Drag guest to table
- Auto-assign to first available seat OR no specific seat

**Mode 2: Seat-level assignment** (New)
- Drag guest to specific seat number/position
- Visual feedback showing which seat is being targeted
- Swap with existing guest if seat is occupied (with confirmation)

### C. User Interactions

1. **Assign to table (no specific seat)**
   - Drag guest to table header → assigned to table, seat_position = NULL

2. **Assign to specific seat**
   - Drag guest to seat slot → assigned to table at that seat_position

3. **Move between seats at same table**
   - Drag guest card to different seat → update seat_position only

4. **Swap guests**
   - Drag guest A onto guest B → swap their seat positions

5. **View mode toggle**
   - Toggle between "Table view" and "Seat view"
   - Table view: current implementation (guests grouped by table)
   - Seat view: guests shown in specific seat positions

---

## 7. TypeScript Type Updates

### File: `src/types.ts`

```typescript
export interface SeatingAssignment {
  id: number;
  event_id: number;
  guest_id: number;
  table_id: number;
  seat_position: number | null;  // ADD THIS
  created_at: string;
  updated_at: string;
}

export interface TableWithSeats {
  id: number;
  name: string;
  capacity: number;
  seats: Array<{
    position: number;
    guest?: Guest;
    assignment?: SeatingAssignment;
  }>;
}
```

---

## 8. Component Updates

### A. DragAndDropCanvas.tsx

**Changes needed:**
1. Add seat position visualization mode toggle
2. Update `tableGuests` mapping to include seat positions
3. Handle drops on specific seats vs table header

```typescript
// Map table to seats with guests
const tableSeats: Record<number, Array<{ position: number; guest: any | null }>> = {};
tables.forEach((table: any) => {
  tableSeats[table.id] = Array.from({ length: table.capacity }, (_, i) => ({
    position: i + 1,
    guest: null,
  }));
});

assignments.forEach((a: any) => {
  if (a.seat_position && tableSeats[a.table_id]) {
    const guest = guests.find((g: any) => g.id === a.guest_id);
    if (guest && a.seat_position <= table.capacity) {
      tableSeats[a.table_id][a.seat_position - 1].guest = guest;
    }
  }
});
```

### B. TableComponent.tsx

**New component for seat visualization:**

```typescript
interface TableWithSeatsProps {
  table: any;
  seats: Array<{ position: number; guest: any | null }>;
  onDropOnSeat: (guestId: number, tableId: number, seatPosition: number) => void;
}

export function TableWithSeats({ table, seats, onDropOnSeat }: TableWithSeatsProps) {
  return (
    <div className="table-container">
      <h3>{table.name} - Capacity: {table.capacity}</h3>
      <div className="seats-grid">
        {seats.map((seat) => (
          <DroppableSeat
            key={seat.position}
            tableId={table.id}
            position={seat.position}
            guest={seat.guest}
            onDrop={onDropOnSeat}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Implementation Phases

### Phase 1: Database & API (Backend)
1. Create migration to add seat_position column
2. Update database types
3. Update validators
4. Update POST/PATCH assignment endpoints
5. Create swap endpoint (optional for Phase 1)
6. Test with API calls

### Phase 2: Basic Frontend Support
1. Update frontend hooks to accept seat_position
2. Update drag handler to optionally specify seat position
3. Add seat position display in guest cards
4. Test manual seat assignment via API

### Phase 3: Seat Visualization UI
1. Create TableWithSeats component
2. Add seat grid/list view
3. Add droppable seat zones
4. Add mode toggle (table view vs seat view)
5. Add visual feedback for seat availability

### Phase 4: Advanced Features
1. Implement seat swapping
2. Auto-assignment to next available seat
3. Seat reordering/shuffling
4. Circular table visualization
5. Seat position optimization in AI generation

---

## 10. Backward Compatibility

**Approach:** Seat positions are optional (nullable)

- Existing assignments: `seat_position = NULL` (assigned to table, no specific seat)
- New assignments: Can specify `seat_position` or leave NULL
- Migration: No data loss, existing assignments remain valid
- UI: Show seated guests first, then unseated guests at each table

**Display logic:**
```typescript
const seatedGuests = tableGuests.filter(g => g.seat_position !== null)
  .sort((a, b) => a.seat_position - b.seat_position);
const unseatedGuests = tableGuests.filter(g => g.seat_position === null);
```

---

## 11. Testing Checklist

### Database Tests
- [ ] Migration runs successfully
- [ ] seat_position accepts NULL
- [ ] seat_position accepts positive integers
- [ ] seat_position rejects negative/zero values
- [ ] UNIQUE constraint prevents duplicate seat assignments
- [ ] Existing UNIQUE(guest_id, event_id) still works

### API Tests
- [ ] Can create assignment without seat_position
- [ ] Can create assignment with seat_position
- [ ] Validates seat_position <= table.capacity
- [ ] Returns 409 when seat already taken
- [ ] Can update seat_position
- [ ] Can swap seats between two guests

### Frontend Tests
- [ ] Can assign guest to table (no seat)
- [ ] Can assign guest to specific seat
- [ ] Seat view displays correctly
- [ ] Drag and drop to seats works
- [ ] Seat swap interaction works
- [ ] Shows seat availability correctly

---

## 12. Future Enhancements

1. **Visual table layouts**
   - Custom table shapes (round, rectangular, U-shape)
   - Drag to position seats visually
   - Save custom layouts per event

2. **Seat preferences**
   - Guest seating preferences (window, aisle, near/far from stage)
   - Accessibility requirements
   - VIP seating zones

3. **Optimization**
   - AI-powered seat ordering within tables
   - Optimize based on relationships and conversation flow
   - Consider table orientation (stage, dance floor, etc.)

4. **Export/Print**
   - Print seat labels
   - Export seating chart with seat numbers
   - Name cards with seat assignments

---

## Estimated Effort

- **Phase 1 (Backend):** 4-6 hours
- **Phase 2 (Basic Frontend):** 3-4 hours
- **Phase 3 (Seat UI):** 6-8 hours
- **Phase 4 (Advanced):** 8-10 hours

**Total:** 21-28 hours for full implementation
