# API Endpoint Implementation Plan: List Events

## 1. Endpoint Overview

This endpoint retrieves a paginated list of events for the authenticated user. It supports filtering via search, sorting by multiple fields, and pagination controls. The endpoint returns events with computed statistics including guest count, table count, and assigned guest count.

**Primary Use Cases:**
- Display user's event dashboard
- Search for specific events by name
- Sort events by creation date, update date, event date, or name
- Navigate through large event lists with pagination

**Business Logic:**
- Only return events owned by the authenticated user (enforced via RLS)
- Include computed aggregates for each event
- Support flexible sorting and searching

## 2. Request Details

### HTTP Method
**GET**

### URL Structure
```
/api/events
```

### Headers
- **Required:**
  - `Authorization: Bearer {access_token}` - JWT token from Supabase Auth

### Query Parameters

#### Required Parameters
None - all parameters are optional with sensible defaults

#### Optional Parameters

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `page` | number | 1 | Must be positive integer >= 1 | Page number for pagination |
| `limit` | number | 20 | Must be integer between 1-100 | Number of items per page |
| `sort` | string | "created_at" | Must be one of: "created_at", "updated_at", "date", "name" | Field to sort by |
| `order` | string | "desc" | Must be one of: "asc", "desc" | Sort order direction |
| `search` | string | undefined | Max 255 characters | Search term for event name (case-insensitive partial match) |

### Request Example
```
GET /api/events?page=1&limit=20&sort=date&order=asc&search=wedding
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Used Types

### Request DTOs

```typescript
// From src/types.ts
export interface ListEventsQueryDto {
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'updated_at' | 'date' | 'name';
  order?: 'asc' | 'desc';
  search?: string;
}
```

### Response DTOs

```typescript
// From src/types.ts
export type ListEventsResponseDto = PaginatedResponse<EventWithStatsDto>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface EventWithStatsDto extends EventDto {
  guest_count?: number;
  table_count?: number;
  assigned_count?: number;
}

export type EventDto = EventEntity;

// EventEntity from database.types.ts
type EventEntity = {
  id: number;
  user_id: string;
  name: string;
  date: string;
  created_at: string;
  updated_at: string;
}
```

### Command Models
Not applicable for read-only operations (no command pattern needed for queries)

### Validation Schemas

```typescript
// To be created - validation schema using Zod
import { z } from 'zod';

export const ListEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['created_at', 'updated_at', 'date', 'name']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(255).optional(),
});
```

## 4. Response Details

### Success Response (200 OK)

**Content-Type:** `application/json`

**Response Structure:**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid-string",
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

**Notes:**
- `data` array may be empty if user has no events or search returns no results
- Computed fields (`guest_count`, `table_count`, `assigned_count`) may be 0 or undefined for events with no guests/tables
- All timestamps in ISO 8601 format with UTC timezone

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 100",
      "code": "invalid_range"
    }
  ]
}
```

**Triggers:**
- Invalid page number (negative, zero, non-integer)
- Invalid limit (exceeds 100, less than 1)
- Invalid sort field
- Invalid order value
- Search string exceeds max length

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "auth_invalid_token"
}
```

**Triggers:**
- Missing Authorization header
- Malformed JWT token
- Expired JWT token
- Invalid signature

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "uuid-generated-for-this-request"
}
```

**Triggers:**
- Database connection failures
- Unexpected query errors
- Unhandled exceptions in service layer

## 5. Data Flow

### Request Flow

```
1. Client Request
   └─> [Astro API Endpoint Handler] GET /api/events
       │
       ├─> Extract query parameters from URL
       └─> Extract Authorization header
           │
           ▼
2. Authentication Middleware
   └─> [Supabase Auth Middleware] (src/middleware/index.ts)
       │
       ├─> Validate JWT token
       ├─> Extract user_id from token
       └─> Add supabase client to context.locals
           │
           ▼
3. Route Handler
   └─> [API Route Handler] (pages/api/events/index.ts or similar)
       │
       ├─> Validate query parameters using Zod schema
       ├─> Handle validation errors → 400 response
       └─> Call service layer with validated inputs
           │
           ▼
4. Service Layer
   └─> [EventsService.listEventsForUser()]
       │
       ├─> Build Supabase query
       │   ├─> Apply RLS filter (user_id = auth.uid())
       │   ├─> Apply search filter (ILIKE on name)
       │   ├─> Apply sorting (order by sort field + order)
       │   └─> Apply pagination (range calculation)
       │
       ├─> Execute count query (for total)
       ├─> Execute data query (for events)
       │
       ├─> For each event, fetch aggregated stats:
       │   ├─> Count guests (from guests table)
       │   ├─> Count tables (from tables table)
       │   └─> Count assigned guests (from seating_assignments)
       │
       └─> Format response with pagination metadata
           │
           ▼
5. Response Formatting
   └─> Calculate total_pages = ceil(total / limit)
   └─> Return ListEventsResponseDto
           │
           ▼
6. Client Response
   └─> 200 OK with JSON body
```

### Database Interactions

**Primary Query:**
```sql
-- Conceptual query (actual implementation uses Supabase client)
SELECT id, user_id, name, date, created_at, updated_at
FROM events
WHERE user_id = $auth_user_id
  AND ($search IS NULL OR name ILIKE '%' || $search || '%')
ORDER BY $sort_field $order
LIMIT $limit
OFFSET ($page - 1) * $limit;
```

**Count Query:**
```sql
SELECT COUNT(*) as total
FROM events
WHERE user_id = $auth_user_id
  AND ($search IS NULL OR name ILIKE '%' || $search || '%');
```

**Aggregated Stats (per event):**
```sql
-- Guest count
SELECT COUNT(*) FROM guests WHERE event_id = $event_id;

-- Table count
SELECT COUNT(*) FROM tables WHERE event_id = $event_id;

-- Assigned count
SELECT COUNT(*) FROM seating_assignments WHERE event_id = $event_id;
```

**Optimization Note:** Consider using a single query with LEFT JOINs and GROUP BY to fetch all stats in one database round trip.

### External Service Interactions
None - this endpoint doesn't interact with external services like OpenRouter AI

## 6. Security Considerations

### Authentication
- **JWT Validation:** Every request must include a valid JWT token in the Authorization header
- **Token Verification:** Supabase middleware verifies token signature, expiration, and issuer
- **User Extraction:** User ID is extracted from verified token claims (`auth.uid()`)
- **Middleware Integration:** Authentication happens at middleware level before route handler

### Authorization
- **Row Level Security (RLS):** PostgreSQL RLS policies automatically filter queries to only return events where `user_id = auth.uid()`
- **Double-Check:** Service layer should explicitly filter by user_id as defense-in-depth
- **No Direct ID Access:** Users cannot request events by ID in list endpoint (different from GET /api/events/{id})

### Input Validation
- **Type Safety:** Zod schema validation ensures type correctness
- **Whitelist Validation:** `sort` and `order` parameters validated against enum whitelists to prevent SQL injection
- **Length Limits:** Search string limited to 255 characters to prevent DoS
- **Range Validation:** Page and limit validated to prevent negative numbers or excessive values
- **Sanitization:** Supabase client uses parameterized queries, preventing SQL injection

### Rate Limiting
- **Standard Endpoints:** 100 requests per minute per user (per API specification)
- **Implementation:** Implement rate limiting middleware using user_id from token
- **Response:** 429 Too Many Requests when limit exceeded

### Data Privacy
- **User Isolation:** RLS ensures users can only see their own events
- **No Cross-User Leakage:** Aggregated stats only count resources belonging to the user's events
- **Token Security:** JWT tokens transmitted only over HTTPS

### Potential Threats and Mitigations

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Authentication Bypass** | Attacker attempts to access events without valid token | Middleware rejects requests without valid JWT; returns 401 |
| **SQL Injection** | Malicious input in search or sort parameters | Parameterized queries via Supabase client; whitelist validation for sort/order |
| **Information Disclosure** | User attempts to access another user's events | RLS policies enforce user_id filtering at database level |
| **Parameter Tampering** | Modified sort/order values cause errors or unexpected behavior | Enum validation using Zod; only whitelisted values accepted |
| **Denial of Service** | Large limit values or excessive pagination | Cap limit at 100; implement rate limiting; validate page number |
| **Token Theft** | Stolen JWT used by attacker | HTTPS-only; short token expiration (1 hour); refresh token rotation |

## 7. Error Handling

### Error Handling Strategy

1. **Validation Errors (400):**
   - Caught at route handler level after Zod validation
   - Return structured error response with field-level details
   - Log validation failures with request context

2. **Authentication Errors (401):**
   - Caught at middleware level
   - Return generic error message (don't leak auth details)
   - Log authentication attempts with IP address

3. **Database Errors (500):**
   - Caught in service layer with try-catch
   - Log full error stack trace with request_id
   - Return sanitized error message (don't leak schema details)

4. **Unexpected Errors (500):**
   - Global error handler at API route level
   - Generate unique request_id for tracking
   - Log full context including user_id, endpoint, parameters
   - Return generic error message

### Error Response Examples

**Validation Error Example:**
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Number must be less than or equal to 100",
      "code": "too_big"
    },
    {
      "field": "sort",
      "message": "Invalid enum value. Expected 'created_at' | 'updated_at' | 'date' | 'name'",
      "code": "invalid_enum_value"
    }
  ]
}
```

**Authentication Error Example:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "auth_invalid_token"
}
```

**Database Error Example:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "a3f2b1c4-5d6e-7f8g-9h0i-1j2k3l4m5n6o"
}
```

### Error Logging

**Structure:**
```typescript
interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn';
  request_id: string;
  user_id?: string;
  endpoint: string;
  method: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  context: {
    query_params?: Record<string, unknown>;
    headers?: Record<string, string>;
    ip_address?: string;
  };
}
```

**Logging Strategy:**
- 400 errors: Log at 'warn' level with query parameters
- 401 errors: Log at 'warn' level with IP address
- 500 errors: Log at 'error' level with full stack trace
- Include request_id in all logs for correlation

## 8. Performance Considerations

### Database Performance

**Indexing Strategy:**
- **Required Indexes:**
  - `events.user_id` - Primary filter for RLS (should already exist)
  - `events.created_at` - Default sort field
  - `events.date` - Common sort field
  - `events.name` - Search field (consider GIN index for ILIKE)
  - Composite index on `(user_id, created_at DESC)` for optimized pagination

**Query Optimization:**
- Use database indexes to support WHERE, ORDER BY, and LIMIT/OFFSET clauses
- Consider cursor-based pagination for large datasets (future enhancement)
- Batch aggregate queries using JOIN instead of N+1 queries per event

**Recommended Query Structure:**
```sql
SELECT
  e.id,
  e.user_id,
  e.name,
  e.date,
  e.created_at,
  e.updated_at,
  COUNT(DISTINCT g.id) as guest_count,
  COUNT(DISTINCT t.id) as table_count,
  COUNT(DISTINCT sa.id) as assigned_count
FROM events e
LEFT JOIN guests g ON g.event_id = e.id
LEFT JOIN tables t ON t.event_id = e.id
LEFT JOIN seating_assignments sa ON sa.event_id = e.id
WHERE e.user_id = $user_id
  AND ($search IS NULL OR e.name ILIKE '%' || $search || '%')
GROUP BY e.id
ORDER BY e.created_at DESC
LIMIT $limit OFFSET $offset;
```

### Caching Strategy

**Cache Configuration:**
- Event metadata cached for 5 minutes per API spec
- Cache key: `events:list:${user_id}:${page}:${limit}:${sort}:${order}:${search || 'all'}`
- Invalidate cache on event creation, update, or deletion
- Use Redis or in-memory cache (e.g., node-cache for MVP)

**ETags for Conditional Requests:**
- Generate ETag based on latest `updated_at` timestamp
- Support `If-None-Match` header
- Return 304 Not Modified when ETag matches

### Pagination Performance

**Offset Pagination Concerns:**
- OFFSET becomes slow for large page numbers (e.g., page 1000)
- Database must scan and skip all previous rows

**Mitigation:**
- Cap total pages shown in UI (e.g., max 100 pages)
- For large datasets, recommend cursor-based pagination (future enhancement)
- Use composite indexes to make OFFSET more efficient

**Limit Constraints:**
- Default: 20 items (balances UX and performance)
- Maximum: 100 items (prevents excessive data transfer)
- Consider lower maximum for mobile clients

### Response Size Optimization

**Computed Fields:**
- Fetch aggregates efficiently using GROUP BY
- Consider omitting stats if not needed (add `include_stats` query param)

**Compression:**
- Enable gzip compression for JSON responses (handled at server level)
- Typical compression ratio: 70-80% for JSON

**Data Transfer:**
- Estimated response size: ~500 bytes per event (without compression)
- Max response at limit=100: ~50KB (before compression)

### Bottlenecks and Solutions

| Bottleneck | Impact | Solution |
|------------|--------|----------|
| **N+1 Query Problem** | Slow response for events with aggregates | Use JOIN with GROUP BY to fetch all data in single query |
| **Large OFFSET Values** | Slow pagination for high page numbers | Implement cursor-based pagination; cap visible pages |
| **Search Performance** | ILIKE is slow without index | Create GIN index on `name` field for trigram matching |
| **No Caching** | Repeated queries for same data | Implement Redis cache with 5-minute TTL |
| **Large Result Sets** | High memory usage, slow serialization | Enforce strict limit cap (100); stream results if needed |

## 9. Implementation Steps

### Step 1: Create Validation Schema
**File:** `src/validators/events.validator.ts`

```typescript
import { z } from 'zod';

export const ListEventsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['created_at', 'updated_at', 'date', 'name']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(255).optional(),
});

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
```

**Testing:**
- Validate with correct inputs
- Test edge cases (limit=0, limit=101, page=0, invalid sort)
- Verify default values are applied

### Step 2: Create Service Layer
**File:** `src/services/events.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { ListEventsResponseDto, ListEventsQueryDto } from '../types';

export class EventsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async listEventsForUser(
    userId: string,
    query: ListEventsQueryDto
  ): Promise<ListEventsResponseDto> {
    // Apply defaults
    const page = query.page || 1;
    const limit = query.limit || 20;
    const sort = query.sort || 'created_at';
    const order = query.order || 'desc';
    const search = query.search;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build base query
    let dataQuery = this.supabase
      .from('events')
      .select(`
        id,
        user_id,
        name,
        date,
        created_at,
        updated_at,
        guests:guests(count),
        tables:tables(count),
        seating_assignments:seating_assignments(count)
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Apply search filter
    if (search) {
      dataQuery = dataQuery.ilike('name', `%${search}%`);
    }

    // Apply sorting
    dataQuery = dataQuery.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await dataQuery;

    if (error) {
      throw error;
    }

    // Transform data to include computed counts
    const events = data?.map(event => ({
      id: event.id,
      user_id: event.user_id,
      name: event.name,
      date: event.date,
      created_at: event.created_at,
      updated_at: event.updated_at,
      guest_count: event.guests?.[0]?.count || 0,
      table_count: event.tables?.[0]?.count || 0,
      assigned_count: event.seating_assignments?.[0]?.count || 0,
    })) || [];

    // Calculate pagination metadata
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }
}
```

**Testing:**
- Test with different query combinations
- Verify RLS enforcement (user can only see their events)
- Test with empty result set
- Test pagination edge cases (last page, page beyond total)

### Step 3: Create API Route Handler
**File:** `src/pages/api/events/index.ts` (or appropriate Astro API route)

```typescript
import type { APIRoute } from 'astro';
import { ListEventsQuerySchema } from '../../../validators/events.validator';
import { EventsService } from '../../../services/events.service';
import { ZodError } from 'zod';

export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          code: 'auth_invalid_token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      sort: url.searchParams.get('sort'),
      order: url.searchParams.get('order'),
      search: url.searchParams.get('search'),
    };

    const validatedQuery = ListEventsQuerySchema.parse(queryParams);

    // 4. Call service layer
    const eventsService = new EventsService(supabase);
    const result = await eventsService.listEventsForUser(user.id, validatedQuery);

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      const details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return new Response(
        JSON.stringify({
          error: 'Validation Error',
          message: 'Request validation failed',
          details,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle unexpected errors
    const requestId = crypto.randomUUID();
    console.error('[List Events Error]', {
      request_id: requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        request_id: requestId,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

**Testing:**
- Test successful request with various query combinations
- Test missing Authorization header (401)
- Test invalid query parameters (400)
- Test with authenticated user having no events
- Test search functionality
- Test pagination

### Step 4: Update Middleware (if needed)
**File:** `src/middleware/index.ts`

Verify middleware is correctly adding Supabase client to context:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient } from '../db/supabase.client';

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

**Testing:**
- Verify supabase client is available in route handlers
- Test that RLS policies are enforced

### Step 5: Configure Database Indexes
**Migration File:** Create Supabase migration

```sql
-- Index for user filtering (likely already exists)
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);

-- Index for default sorting
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Index for date sorting
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);

-- Composite index for optimized pagination
CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC);

-- GIN index for search (trigram matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_events_name_search ON events USING GIN (name gin_trgm_ops);
```

**Testing:**
- Run migration on development database
- Verify indexes with `EXPLAIN ANALYZE`
- Test query performance before and after indexes

### Step 6: Implement Rate Limiting (Optional for MVP)
**File:** `src/middleware/rate-limit.ts`

```typescript
import { defineMiddleware } from 'astro:middleware';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = defineMiddleware(async (context, next) => {
  const user = await context.locals.supabase.auth.getUser();
  if (!user.data.user) {
    return next();
  }

  const userId = user.data.user.id;
  const now = Date.now();
  const limit = 100; // requests per minute
  const window = 60 * 1000; // 1 minute

  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + window });
    return next();
  }

  if (userLimit.count >= limit) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        code: 'rate_limit_exceeded',
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  userLimit.count++;
  return next();
});
```

**Testing:**
- Send 101 requests rapidly and verify 429 response
- Verify reset after time window
- Test with different users

### Step 7: Add Error Logging
**File:** `src/utils/logger.ts`

```typescript
interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  request_id: string;
  user_id?: string;
  endpoint: string;
  method: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
}

export function logError(log: ErrorLog): void {
  // For MVP: console.log
  // For production: send to logging service (e.g., Sentry, Datadog)
  console.error(JSON.stringify(log));
}

export function logWarning(log: Omit<ErrorLog, 'level'>): void {
  console.warn(JSON.stringify({ ...log, level: 'warn' }));
}
```

Update route handler to use logger:

```typescript
import { logError } from '../../../utils/logger';

// In error handler:
logError({
  timestamp: new Date().toISOString(),
  level: 'error',
  request_id: requestId,
  user_id: user?.id,
  endpoint: '/api/events',
  method: 'GET',
  error_type: error.constructor.name,
  error_message: error instanceof Error ? error.message : 'Unknown error',
  stack_trace: error instanceof Error ? error.stack : undefined,
  context: { queryParams: validatedQuery },
});
```

**Testing:**
- Verify logs are generated for errors
- Check log format is correct JSON
- Verify PII is not logged

### Step 8: Write Integration Tests
**File:** `tests/api/events.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createTestClient, createTestUser } from '../helpers/test-setup';

describe('GET /api/events', () => {
  it('returns 401 without auth token', async () => {
    const response = await fetch('http://localhost:4321/api/events');
    expect(response.status).toBe(401);
  });

  it('returns paginated events for authenticated user', async () => {
    const { token, userId } = await createTestUser();
    // Create test events...

    const response = await fetch('http://localhost:4321/api/events', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
  });

  it('filters events by search term', async () => {
    // Test search functionality
  });

  it('sorts events correctly', async () => {
    // Test sorting
  });

  it('validates query parameters', async () => {
    const { token } = await createTestUser();
    const response = await fetch('http://localhost:4321/api/events?limit=1000', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(400);
  });
});
```

**Testing:**
- Run full test suite
- Verify all edge cases are covered
- Check test coverage is > 80%

### Step 9: Documentation
**File:** Update API documentation or README

- Document endpoint behavior
- Provide example requests and responses
- Document error codes and meanings
- Add rate limiting information

### Step 10: Deployment Checklist
- [ ] Environment variables configured (SUPABASE_URL, SUPABASE_KEY)
- [ ] Database migrations applied
- [ ] Indexes created and verified
- [ ] Rate limiting configured (if implemented)
- [ ] Logging configured to production service
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Performance testing completed (response time < 500ms)
- [ ] Security review completed
- [ ] API documentation updated
- [ ] Deployment pipeline configured
- [ ] Monitoring and alerting configured

---

## Appendix: Example Supabase Query Implementation

### Optimized Query with Aggregates

```typescript
// Alternative approach using Supabase's RPC function for better performance
const { data, error } = await supabase.rpc('list_events_with_stats', {
  p_user_id: userId,
  p_page: page,
  p_limit: limit,
  p_sort: sort,
  p_order: order,
  p_search: search,
});
```

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION list_events_with_stats(
  p_user_id UUID,
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20,
  p_sort TEXT DEFAULT 'created_at',
  p_order TEXT DEFAULT 'desc',
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id INT,
  user_id UUID,
  name TEXT,
  date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  guest_count BIGINT,
  table_count BIGINT,
  assigned_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    e.name,
    e.date,
    e.created_at,
    e.updated_at,
    COALESCE(COUNT(DISTINCT g.id), 0) AS guest_count,
    COALESCE(COUNT(DISTINCT t.id), 0) AS table_count,
    COALESCE(COUNT(DISTINCT sa.id), 0) AS assigned_count,
    COUNT(*) OVER() AS total_count
  FROM events e
  LEFT JOIN guests g ON g.event_id = e.id
  LEFT JOIN tables t ON t.event_id = e.id
  LEFT JOIN seating_assignments sa ON sa.event_id = e.id
  WHERE e.user_id = p_user_id
    AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%')
  GROUP BY e.id
  ORDER BY
    CASE WHEN p_sort = 'created_at' AND p_order = 'asc' THEN e.created_at END ASC,
    CASE WHEN p_sort = 'created_at' AND p_order = 'desc' THEN e.created_at END DESC,
    CASE WHEN p_sort = 'updated_at' AND p_order = 'asc' THEN e.updated_at END ASC,
    CASE WHEN p_sort = 'updated_at' AND p_order = 'desc' THEN e.updated_at END DESC,
    CASE WHEN p_sort = 'date' AND p_order = 'asc' THEN e.date END ASC,
    CASE WHEN p_sort = 'date' AND p_order = 'desc' THEN e.date END DESC,
    CASE WHEN p_sort = 'name' AND p_order = 'asc' THEN e.name END ASC,
    CASE WHEN p_sort = 'name' AND p_order = 'desc' THEN e.name END DESC
  LIMIT p_limit
  OFFSET (p_page - 1) * p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This approach may provide better performance for complex aggregations by pushing all logic to the database.
