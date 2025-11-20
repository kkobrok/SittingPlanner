# REST API Plan - EasySeating

## 1. Resources

The API is organized around the following main resources, each corresponding to database tables:

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Events | `events` | Wedding/event information owned by users |
| Guests | `guests` | Guest information for specific events |
| Guest Relationships | `guest_relationships` | Relationships between pairs of guests |
| Tables | `tables` | Table configurations for events |
| Seating Assignments | `seating_assignments` | Assignments of guests to tables |
| Seating Plans | N/A (Composite) | AI-generated or manually adjusted seating arrangements |

## 2. Endpoints

### 2.1 Authentication Endpoints

#### Register User
- **Method:** POST
- **Path:** `/api/auth/register`
- **Description:** Create a new user account
- **Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 6 characters)"
}
```
- **Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "created_at": "timestamp"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_at": "timestamp"
  }
}
```
- **Error Responses:**
  - 400 Bad Request: Invalid email or password format
  - 409 Conflict: Email already registered

#### Login
- **Method:** POST
- **Path:** `/api/auth/login`
- **Description:** Authenticate user and create session
- **Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```
- **Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "string"
  },
  "session": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_at": "timestamp"
  }
}
```
- **Error Responses:**
  - 401 Unauthorized: Invalid credentials

#### Logout
- **Method:** POST
- **Path:** `/api/auth/logout`
- **Description:** Terminate user session
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

#### Password Reset Request
- **Method:** POST
- **Path:** `/api/auth/password-reset`
- **Description:** Request password reset email
- **Request Body:**
```json
{
  "email": "string (required)"
}
```
- **Response (200 OK):**
```json
{
  "message": "Password reset email sent"
}
```

### 2.2 Events Resource

#### List Events
- **Method:** GET
- **Path:** `/api/events`
- **Description:** Retrieve all events for the authenticated user
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1): Page number
  - `limit` (optional, default: 20, max: 100): Items per page
  - `sort` (optional, default: "created_at"): Sort field (created_at, updated_at, date, name)
  - `order` (optional, default: "desc"): Sort order (asc, desc)
  - `search` (optional): Search in event name
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "name": "John & Jane's Wedding",
      "date": "2025-06-15",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z",
      "guest_count": 150,
      "table_count": 15,
      "assigned_count": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token

#### Get Event
- **Method:** GET
- **Path:** `/api/events/{id}`
- **Description:** Retrieve a specific event
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (200 OK):**
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "John & Jane's Wedding",
  "date": "2025-06-15",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z",
  "guest_count": 150,
  "table_count": 15,
  "assigned_count": 120
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Create Event
- **Method:** POST
- **Path:** `/api/events`
- **Description:** Create a new event
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (required, max 255 characters)",
  "date": "string (required, ISO 8601 date format)"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "John & Jane's Wedding",
  "date": "2025-06-15",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token

#### Update Event
- **Method:** PATCH
- **Path:** `/api/events/{id}`
- **Description:** Update an existing event
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (optional, max 255 characters)",
  "date": "string (optional, ISO 8601 date format)"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "user_id": "uuid",
  "name": "Updated Event Name",
  "date": "2025-06-15",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-16T14:30:00Z"
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Delete Event
- **Method:** DELETE
- **Path:** `/api/events/{id}`
- **Description:** Delete an event and all associated data (guests, tables, assignments)
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (204 No Content)**
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

### 2.3 Guests Resource

#### List Guests
- **Method:** GET
- **Path:** `/api/events/{event_id}/guests`
- **Description:** Retrieve all guests for a specific event
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1): Page number
  - `limit` (optional, default: 50, max: 200): Items per page
  - `sort` (optional, default: "name"): Sort field (name, age_range)
  - `order` (optional, default: "asc"): Sort order (asc, desc)
  - `search` (optional): Search in guest name
  - `age_range` (optional): Filter by age range
  - `drinking_habits` (optional): Filter by drinking habits
  - `assigned` (optional, boolean): Filter by assignment status
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "name": "John Doe",
      "age_range": "30-40",
      "drinking_habits": "moderate",
      "dietary_restrictions": "vegetarian",
      "hobbies_interests": "photography, hiking",
      "topics_to_avoid": "politics",
      "table_assignment": {
        "table_id": 5,
        "table_name": "Table A"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Get Guest
- **Method:** GET
- **Path:** `/api/guests/{id}`
- **Description:** Retrieve a specific guest
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (200 OK):**
```json
{
  "id": 1,
  "event_id": 1,
  "name": "John Doe",
  "age_range": "30-40",
  "drinking_habits": "moderate",
  "dietary_restrictions": "vegetarian",
  "hobbies_interests": "photography, hiking",
  "topics_to_avoid": "politics",
  "relationships": [
    {
      "id": 1,
      "guest_id": 2,
      "guest_name": "Jane Smith",
      "relationship_type": "friend",
      "strength": 8
    }
  ],
  "table_assignment": {
    "table_id": 5,
    "table_name": "Table A"
  }
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Guest does not belong to user's event
  - 404 Not Found: Guest does not exist

#### Create Guest
- **Method:** POST
- **Path:** `/api/events/{event_id}/guests`
- **Description:** Create a new guest for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (required, max 255 characters)",
  "age_range": "string (optional, max 50 characters)",
  "drinking_habits": "string (optional, max 50 characters)",
  "dietary_restrictions": "string (optional, max 255 characters)",
  "hobbies_interests": "string (optional, max 255 characters)",
  "topics_to_avoid": "string (optional, max 255 characters)"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "event_id": 1,
  "name": "John Doe",
  "age_range": "30-40",
  "drinking_habits": "moderate",
  "dietary_restrictions": "vegetarian",
  "hobbies_interests": "photography, hiking",
  "topics_to_avoid": "politics"
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Bulk Create Guests
- **Method:** POST
- **Path:** `/api/events/{event_id}/guests/bulk`
- **Description:** Create multiple guests at once (CSV import support)
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "guests": [
    {
      "name": "string (required)",
      "age_range": "string (optional)",
      "drinking_habits": "string (optional)",
      "dietary_restrictions": "string (optional)",
      "hobbies_interests": "string (optional)",
      "topics_to_avoid": "string (optional)"
    }
  ]
}
```
- **Response (201 Created):**
```json
{
  "created": 50,
  "failed": 0,
  "guests": [
    {
      "id": 1,
      "name": "John Doe"
    }
  ],
  "errors": []
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user

#### Update Guest
- **Method:** PATCH
- **Path:** `/api/guests/{id}`
- **Description:** Update an existing guest
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (optional, max 255 characters)",
  "age_range": "string (optional, max 50 characters)",
  "drinking_habits": "string (optional, max 50 characters)",
  "dietary_restrictions": "string (optional, max 255 characters)",
  "hobbies_interests": "string (optional, max 255 characters)",
  "topics_to_avoid": "string (optional, max 255 characters)"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "event_id": 1,
  "name": "John Doe",
  "age_range": "30-40",
  "drinking_habits": "moderate",
  "dietary_restrictions": "vegetarian, gluten-free",
  "hobbies_interests": "photography, hiking",
  "topics_to_avoid": "politics"
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Guest does not belong to user's event
  - 404 Not Found: Guest does not exist

#### Delete Guest
- **Method:** DELETE
- **Path:** `/api/guests/{id}`
- **Description:** Delete a guest and associated relationships/assignments
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (204 No Content)**
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Guest does not belong to user's event
  - 404 Not Found: Guest does not exist

### 2.4 Guest Relationships Resource

#### List Relationships
- **Method:** GET
- **Path:** `/api/events/{event_id}/relationships`
- **Description:** Retrieve all guest relationships for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1): Page number
  - `limit` (optional, default: 50, max: 200): Items per page
  - `guest_id` (optional): Filter by specific guest
  - `relationship_type` (optional): Filter by relationship type
  - `min_strength` (optional): Minimum relationship strength
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "guest1": {
        "id": 1,
        "name": "John Doe"
      },
      "guest2": {
        "id": 2,
        "name": "Jane Smith"
      },
      "relationship_type": "friend",
      "strength": 8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 200,
    "total_pages": 4
  }
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Create Relationship
- **Method:** POST
- **Path:** `/api/relationships`
- **Description:** Create a relationship between two guests
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "guest1_id": "number (required)",
  "guest2_id": "number (required)",
  "relationship_type": "string (required, max 50 characters)",
  "strength": "number (optional, 1-10)"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "guest1_id": 1,
  "guest2_id": 2,
  "relationship_type": "friend",
  "strength": 8
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors (same guest, invalid IDs)
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Guests do not belong to user's events
  - 404 Not Found: Guest does not exist
  - 409 Conflict: Relationship already exists

#### Update Relationship
- **Method:** PATCH
- **Path:** `/api/relationships/{id}`
- **Description:** Update a relationship
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "relationship_type": "string (optional, max 50 characters)",
  "strength": "number (optional, 1-10)"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "guest1_id": 1,
  "guest2_id": 2,
  "relationship_type": "close friend",
  "strength": 9
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Relationship does not belong to user's events
  - 404 Not Found: Relationship does not exist

#### Delete Relationship
- **Method:** DELETE
- **Path:** `/api/relationships/{id}`
- **Description:** Delete a relationship
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (204 No Content)**
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Relationship does not belong to user's events
  - 404 Not Found: Relationship does not exist

### 2.5 Tables Resource

#### List Tables
- **Method:** GET
- **Path:** `/api/events/{event_id}/tables`
- **Description:** Retrieve all tables for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `sort` (optional, default: "name"): Sort field (name, capacity)
  - `order` (optional, default: "asc"): Sort order (asc, desc)
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "name": "Table A",
      "capacity": 10,
      "assigned_count": 8,
      "available_seats": 2
    }
  ]
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Create Table
- **Method:** POST
- **Path:** `/api/events/{event_id}/tables`
- **Description:** Create a new table for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (required, max 255 characters)",
  "capacity": "number (required, min 1, max 100)"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "event_id": 1,
  "name": "Table A",
  "capacity": 10
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Bulk Create Tables
- **Method:** POST
- **Path:** `/api/events/{event_id}/tables/bulk`
- **Description:** Create multiple tables at once
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "tables": [
    {
      "name": "string (required)",
      "capacity": "number (required)"
    }
  ]
}
```
- **Response (201 Created):**
```json
{
  "created": 15,
  "tables": [
    {
      "id": 1,
      "name": "Table A",
      "capacity": 10
    }
  ]
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user

#### Update Table
- **Method:** PATCH
- **Path:** `/api/tables/{id}`
- **Description:** Update a table
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "name": "string (optional, max 255 characters)",
  "capacity": "number (optional, min 1, max 100)"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "event_id": 1,
  "name": "Table A (Updated)",
  "capacity": 12
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors (capacity less than assigned guests)
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Table does not belong to user's event
  - 404 Not Found: Table does not exist

#### Delete Table
- **Method:** DELETE
- **Path:** `/api/tables/{id}`
- **Description:** Delete a table (only if no guests assigned)
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (204 No Content)**
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Table does not belong to user's event
  - 404 Not Found: Table does not exist
  - 409 Conflict: Table has assigned guests

### 2.6 Seating Assignments Resource

#### List Assignments
- **Method:** GET
- **Path:** `/api/events/{event_id}/assignments`
- **Description:** Retrieve all seating assignments for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `table_id` (optional): Filter by table
  - `guest_id` (optional): Filter by guest
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "event_id": 1,
      "guest": {
        "id": 1,
        "name": "John Doe"
      },
      "table": {
        "id": 5,
        "name": "Table A"
      }
    }
  ]
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

#### Create Assignment
- **Method:** POST
- **Path:** `/api/assignments`
- **Description:** Assign a guest to a table
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "event_id": "number (required)",
  "guest_id": "number (required)",
  "table_id": "number (required)"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 5
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors (table full, guest already assigned)
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Resources do not belong to user's event
  - 404 Not Found: Guest or table does not exist
  - 409 Conflict: Guest already assigned or table at capacity

#### Update Assignment
- **Method:** PATCH
- **Path:** `/api/assignments/{id}`
- **Description:** Move a guest to a different table
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "table_id": "number (required)"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "event_id": 1,
  "guest_id": 1,
  "table_id": 6,
  "optimization_impact": {
    "score_change": -2.5,
    "conflicts": []
  }
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors (table full)
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Assignment does not belong to user's event
  - 404 Not Found: Assignment or table does not exist
  - 409 Conflict: Table at capacity

#### Bulk Update Assignments
- **Method:** PATCH
- **Path:** `/api/events/{event_id}/assignments/bulk`
- **Description:** Update multiple assignments at once
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "assignments": [
    {
      "guest_id": 1,
      "table_id": 5
    }
  ]
}
```
- **Response (200 OK):**
```json
{
  "updated": 50,
  "optimization_impact": {
    "overall_score": 85.5,
    "conflicts": []
  }
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user

#### Delete Assignment
- **Method:** DELETE
- **Path:** `/api/assignments/{id}`
- **Description:** Remove a guest from their assigned table
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (204 No Content)**
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Assignment does not belong to user's event
  - 404 Not Found: Assignment does not exist

#### Clear All Assignments
- **Method:** DELETE
- **Path:** `/api/events/{event_id}/assignments`
- **Description:** Remove all seating assignments for an event
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (200 OK):**
```json
{
  "deleted": 150,
  "message": "All assignments cleared"
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

### 2.7 Seating Plan Generation (AI-Powered)

#### Generate Seating Plan
- **Method:** POST
- **Path:** `/api/events/{event_id}/seating-plans/generate`
- **Description:** Generate an optimized seating plan using AI
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "optimization_factors": {
    "relationships_weight": "number (optional, 0-10, default: 8)",
    "age_compatibility_weight": "number (optional, 0-10, default: 5)",
    "drinking_habits_weight": "number (optional, 0-10, default: 3)",
    "hobbies_weight": "number (optional, 0-10, default: 6)",
    "dietary_restrictions_weight": "number (optional, 0-10, default: 4)"
  },
  "preserve_assignments": "array of guest_ids (optional)",
  "constraints": {
    "must_seat_together": "array of arrays of guest_ids (optional)",
    "must_separate": "array of arrays of guest_ids (optional)"
  }
}
```
- **Response (201 Created):**
```json
{
  "plan_id": "uuid",
  "status": "completed",
  "optimization_score": 87.5,
  "assignments": [
    {
      "guest_id": 1,
      "guest_name": "John Doe",
      "table_id": 5,
      "table_name": "Table A",
      "compatibility_score": 8.5,
      "alternative_tables": [
        {
          "table_id": 6,
          "table_name": "Table B",
          "score": 8.5
        }
      ]
    }
  ],
  "statistics": {
    "total_guests": 150,
    "assigned": 150,
    "unassigned": 0,
    "tables_used": 15,
    "average_table_compatibility": 8.2
  },
  "warnings": [
    "Guest 45 has no strong relationships and was seated randomly"
  ]
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors (insufficient tables, conflicting constraints)
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist
  - 429 Too Many Requests: AI rate limit exceeded
  - 500 Internal Server Error: AI service unavailable

#### Get Seating Plan
- **Method:** GET
- **Path:** `/api/seating-plans/{plan_id}`
- **Description:** Retrieve a previously generated seating plan
- **Headers:** `Authorization: Bearer {access_token}`
- **Response (200 OK):**
```json
{
  "plan_id": "uuid",
  "event_id": 1,
  "created_at": "2025-01-15T10:00:00Z",
  "optimization_score": 87.5,
  "assignments": [],
  "statistics": {}
}
```
- **Error Responses:**
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Plan does not belong to user's event
  - 404 Not Found: Plan does not exist

#### Validate Assignment Impact
- **Method:** POST
- **Path:** `/api/events/{event_id}/seating-plans/validate`
- **Description:** Validate the impact of a proposed assignment change
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "changes": [
    {
      "guest_id": 1,
      "from_table_id": 5,
      "to_table_id": 6
    }
  ]
}
```
- **Response (200 OK):**
```json
{
  "overall_impact": {
    "current_score": 87.5,
    "projected_score": 85.0,
    "score_change": -2.5
  },
  "conflicts": [
    {
      "type": "negative_relationship",
      "guest1_id": 1,
      "guest1_name": "John Doe",
      "guest2_id": 15,
      "guest2_name": "Mike Johnson",
      "severity": "medium",
      "message": "These guests have a negative relationship"
    }
  ],
  "improvements": [],
  "recommendations": [
    "Consider moving guest 1 to Table 8 instead for a score of 88.0"
  ]
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user

### 2.8 Templates and Export

#### Save as Template
- **Method:** POST
- **Path:** `/api/events/{event_id}/templates`
- **Description:** Save current event configuration as a template
- **Headers:** `Authorization: Bearer {access_token}`
- **Request Body:**
```json
{
  "template_name": "string (required, max 255 characters)",
  "description": "string (optional, max 1000 characters)",
  "include_guests": "boolean (optional, default: false)",
  "include_assignments": "boolean (optional, default: false)"
}
```
- **Response (201 Created):**
```json
{
  "template_id": "uuid",
  "name": "Wedding Template",
  "description": "Standard wedding layout",
  "created_at": "2025-01-15T10:00:00Z"
}
```
- **Error Responses:**
  - 400 Bad Request: Validation errors
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user

#### List Templates
- **Method:** GET
- **Path:** `/api/templates`
- **Description:** List all saved templates for the user
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `page` (optional, default: 1): Page number
  - `limit` (optional, default: 20): Items per page
  - `search` (optional): Search in template name/description
- **Response (200 OK):**
```json
{
  "data": [
    {
      "template_id": "uuid",
      "name": "Wedding Template",
      "description": "Standard wedding layout",
      "table_count": 15,
      "guest_count": 150,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

#### Export Seating Plan
- **Method:** GET
- **Path:** `/api/events/{event_id}/export`
- **Description:** Export seating plan in various formats
- **Headers:** `Authorization: Bearer {access_token}`
- **Query Parameters:**
  - `format` (required): Export format (pdf, csv, json)
  - `include_guest_details` (optional, boolean): Include full guest information
- **Response (200 OK):**
  - Content-Type: application/pdf, text/csv, or application/json
  - File download with appropriate format
- **Error Responses:**
  - 400 Bad Request: Invalid format
  - 401 Unauthorized: Missing or invalid token
  - 403 Forbidden: Event does not belong to user
  - 404 Not Found: Event does not exist

## 3. Authentication and Authorization

### Authentication Mechanism
The API uses Supabase Auth with JWT (JSON Web Tokens) for authentication:

1. **Token-Based Authentication:**
   - Users receive an `access_token` and `refresh_token` upon successful login
   - Access tokens expire after 1 hour (configurable in Supabase)
   - Refresh tokens are used to obtain new access tokens without re-authentication

2. **Authorization Header:**
   - All protected endpoints require: `Authorization: Bearer {access_token}`
   - Tokens are validated against Supabase Auth on each request

3. **Row Level Security (RLS):**
   - Database-level security enforced via PostgreSQL RLS policies
   - Users can only access data where `user_id = auth.uid()`
   - Nested resources (guests, tables) checked via parent event ownership

### Authorization Model

**User Permissions:**
- Users have full CRUD access to their own events and all nested resources
- No sharing or collaboration features in initial version
- Future: Premium users may have additional permissions for custom templates

**Access Control Flow:**
1. Request includes JWT in Authorization header
2. Supabase validates token and extracts `user_id`
3. RLS policies automatically filter queries to user's data
4. API layer validates event ownership for nested resources
5. Business logic validates resource relationships (e.g., guest belongs to event)

### Security Measures

1. **Rate Limiting:**
   - Authentication endpoints: 5 requests per minute per IP
   - Standard endpoints: 100 requests per minute per user
   - AI generation endpoint: 10 requests per hour per user
   - Bulk operations: 20 requests per hour per user

2. **Password Requirements:**
   - Minimum 6 characters (Supabase default)
   - Password reset via email verification

3. **Data Validation:**
   - All inputs sanitized and validated
   - SQL injection prevention via parameterized queries
   - XSS prevention via output encoding

4. **HTTPS Only:**
   - All API communication over TLS 1.2+
   - Secure cookie attributes for session management

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Events
- `name`: Required, 1-255 characters, non-empty string
- `date`: Required, valid ISO 8601 date, cannot be in the past
- `user_id`: Automatically set from authenticated user

#### Guests
- `name`: Required, 1-255 characters, non-empty string
- `event_id`: Required, must exist and belong to user
- `age_range`: Optional, max 50 characters
- `drinking_habits`: Optional, max 50 characters
- `dietary_restrictions`: Optional, max 255 characters
- `hobbies_interests`: Optional, max 255 characters
- `topics_to_avoid`: Optional, max 255 characters

#### Guest Relationships
- `guest1_id`: Required, must exist and belong to user's event
- `guest2_id`: Required, must exist and belong to user's event
- `guest1_id ≠ guest2_id`: Cannot create relationship with self
- `relationship_type`: Required, 1-50 characters
- `strength`: Optional, integer 1-10
- Uniqueness: No duplicate relationships between same pair

#### Tables
- `name`: Required, 1-255 characters, non-empty string
- `capacity`: Required, integer, minimum 1, maximum 100
- `event_id`: Required, must exist and belong to user
- Capacity validation: Cannot reduce capacity below current assigned count

#### Seating Assignments
- `event_id`: Required, must exist and belong to user
- `guest_id`: Required, must exist and belong to the event
- `table_id`: Required, must exist and belong to the event
- Uniqueness: Guest can only be assigned to one table
- Capacity check: Table must have available seats
- Relationship validation: All IDs must belong to same event

### 4.2 Business Logic Implementation

#### Seating Plan Generation
**Algorithm Flow:**
1. Collect all guests, relationships, and tables for the event
2. Parse optimization factor weights from request
3. Send data to OpenRouter AI API with custom prompt
4. AI analyzes:
   - Guest relationships and strengths
   - Age compatibility
   - Drinking habits compatibility
   - Shared hobbies/interests
   - Dietary restriction considerations
   - Topics to avoid conflicts
5. AI generates optimized assignments
6. Validate assignments:
   - All guests assigned exactly once
   - No table over capacity
   - Constraints satisfied
7. Calculate compatibility scores per table
8. Identify alternative seating options with equal scores
9. Return assignments with metadata

**Optimization Scoring:**
- Relationship proximity: High-strength positive relationships seated together
- Age grouping: Similar age ranges at same table
- Interest alignment: Shared hobbies increase compatibility
- Dietary needs: Group compatible dietary restrictions
- Conflict avoidance: Separate guests with topics to avoid
- Weighted sum of factors based on user preferences

#### Manual Adjustment Validation
**Real-time Impact Analysis:**
1. User proposes assignment change
2. Calculate current table compatibility scores
3. Simulate proposed change
4. Recalculate affected tables' scores
5. Identify conflicts:
   - Negative relationships at same table
   - Topic avoidance violations
   - Capacity violations
6. Suggest alternatives with better scores
7. Return impact report to user

#### Automatic Saves
- Auto-save event data every 2 minutes during editing
- Maintain version history for undo/redo (last 50 changes)
- Save triggered on:
  - Guest addition/modification
  - Table changes
  - Assignment updates
  - Manual adjustments

#### Bulk Operations
**CSV Import Logic:**
1. Parse CSV file (support Excel-compatible format)
2. Validate headers match expected fields
3. Process each row:
   - Validate required fields
   - Sanitize inputs
   - Check duplicates
4. Transaction-based insert:
   - All succeed or all fail
   - Return detailed error report
5. Support field mapping for flexible column names

#### Template Management
**Save Template:**
- Snapshot event configuration
- Optionally include guest list (anonymized option)
- Store table layout and capacities
- Save optimization preferences
- Generate preview metadata

**Load Template:**
- Create new event from template
- Copy table configurations
- Optionally copy guest list
- Reset all IDs for new context
- Apply to current event

#### Export Functionality
**PDF Export:**
- Generate formatted seating chart
- Include table names and guest lists
- Visual layout representation
- Event metadata header
- QR code for digital access (premium)

**CSV Export:**
- Table-based format: Table Name, Guest Name, Details
- Guest-based format: Guest Name, Table Assignment
- Relationship export option
- Full guest details option

### 4.3 Error Handling Strategy

**Validation Errors (400):**
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required",
      "code": "required_field"
    }
  ]
}
```

**Authentication Errors (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "auth_invalid_token"
}
```

**Authorization Errors (403):**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource",
  "code": "auth_forbidden"
}
```

**Not Found Errors (404):**
```json
{
  "error": "Not Found",
  "message": "The requested resource does not exist",
  "resource": "event",
  "id": 123
}
```

**Conflict Errors (409):**
```json
{
  "error": "Conflict",
  "message": "Guest is already assigned to a table",
  "details": {
    "guest_id": 1,
    "current_table_id": 5
  }
}
```

**Server Errors (500):**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "uuid"
}
```

### 4.4 Performance Considerations

**Pagination:**
- Default page size: 20 (events), 50 (guests, relationships)
- Maximum page size: 100 (events), 200 (guests)
- Cursor-based pagination for large datasets (future)

**Caching Strategy:**
- Event metadata cached for 5 minutes
- Guest lists cached for 2 minutes
- Invalidate cache on updates
- Use ETags for conditional requests

**Database Optimization:**
- Indexes on foreign keys: `event_id`, `guest_id`, `table_id`, `user_id`
- Composite index on `(guest1_id, guest2_id)` for relationships
- Composite index on `(event_id, guest_id, table_id)` for assignments
- Query optimization via RLS policies

**AI Service Integration:**
- Timeout: 30 seconds for generation requests
- Fallback: Return partial results if timeout
- Queue system for high load (future)
- Cost monitoring and budget alerts

### 4.5 Data Integrity Rules

**Cascading Deletes:**
- Delete event → cascade delete guests, tables, assignments
- Delete guest → cascade delete relationships, assignments
- Delete table → prevent if assignments exist (409 Conflict)

**Referential Integrity:**
- All foreign keys enforced at database level
- API validates relationships before operations
- Atomic transactions for multi-table operations

**Consistency Checks:**
- Assignment validation: guest and table belong to same event
- Relationship validation: both guests belong to user's events
- Capacity validation: assignment count ≤ table capacity
- Uniqueness: one assignment per guest per event
