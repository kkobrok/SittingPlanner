# Seat Position API Testing

## Test Scenarios

### 1. Create Assignment with Seat Position

**Request:**
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

**Expected Response (201):**
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 1,
  "seat_position": 3,
  "created_at": "...",
  "updated_at": "..."
}
```

### 2. Create Assignment without Seat Position (Backward Compatibility)

**Request:**
```bash
curl -X POST http://localhost:4321/api/events/1/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "guest_id": 2,
    "table_id": 1
  }'
```

**Expected Response (201):**
```json
{
  "id": 2,
  "event_id": 1,
  "guest_id": 2,
  "table_id": 1,
  "seat_position": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### 3. Try to Create Assignment with Seat Exceeding Capacity

**Request:**
```bash
curl -X POST http://localhost:4321/api/events/1/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "guest_id": 3,
    "table_id": 1,
    "seat_position": 99
  }'
```

**Expected Response (400):**
```json
{
  "error": "Bad Request",
  "message": "Seat position exceeds table capacity of 8",
  "code": "seat_exceeds_capacity"
}
```

### 4. Try to Create Assignment with Already Taken Seat

**Request:** (After creating assignment with seat 3)
```bash
curl -X POST http://localhost:4321/api/events/1/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "guest_id": 4,
    "table_id": 1,
    "seat_position": 3
  }'
```

**Expected Response (409):**
```json
{
  "error": "Conflict",
  "message": "This seat is already occupied by another guest",
  "code": "seat_already_taken"
}
```

### 5. Update Assignment to Different Seat

**Request:**
```bash
curl -X PATCH http://localhost:4321/api/assignments/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "seat_position": 5
  }'
```

**Expected Response (200):**
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 1,
  "seat_position": 5,
  "created_at": "...",
  "updated_at": "..."
}
```

### 6. Update Assignment to Remove Seat Position

**Request:**
```bash
curl -X PATCH http://localhost:4321/api/assignments/1 \
  -H "Content-Type": "application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "seat_position": null
  }'
```

**Expected Response (200):**
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 1,
  "seat_position": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### 7. Get Assignments (Verify seat_position is included)

**Request:**
```bash
curl -X GET http://localhost:4321/api/events/1/assignments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "guest": {
        "id": 1,
        "name": "Alice Johnson"
      },
      "table": {
        "id": 1,
        "name": "Table 1"
      }
    }
  ]
}
```

## Database Verification

Check that the migration was applied:

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'seating_assignments'
  AND column_name = 'seat_position';

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'seating_assignments'
  AND constraint_name IN ('seat_position_positive', 'unique_seat_per_table');

-- View sample data
SELECT id, guest_id, table_id, seat_position
FROM seating_assignments
LIMIT 10;
```

## TypeScript Type Checking

Verify types are working correctly:

```typescript
// Should compile without errors
const assignment: Database['public']['Tables']['seating_assignments']['Row'] = {
  id: 1,
  event_id: 1,
  guest_id: 1,
  table_id: 1,
  seat_position: 3, // Can be number
  created_at: '2025-01-18T00:00:00Z',
  updated_at: '2025-01-18T00:00:00Z',
};

const assignment2: Database['public']['Tables']['seating_assignments']['Row'] = {
  id: 2,
  event_id: 1,
  guest_id: 2,
  table_id: 1,
  seat_position: null, // Can be null
  created_at: '2025-01-18T00:00:00Z',
  updated_at: '2025-01-18T00:00:00Z',
};
```
