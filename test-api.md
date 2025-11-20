# API Testing Guide with cURL

This guide shows how to test the `/api/events` endpoint using cURL commands.

## Prerequisites

1. **Start the dev server:**
   ```bash
   npm run dev
   ```
   Server should be running on http://localhost:3001 (or similar)

2. **Set up Supabase locally (if testing with real data):**
   ```bash
   npx supabase start
   ```

## Test Commands

### Test 1: Without Authentication (401 Unauthorized)

**Expected Result:** Returns 401 error with message about invalid token

```bash
curl -X GET "http://localhost:3001/api/events" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n"
```

**Expected Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "auth_invalid_token"
}

HTTP Status: 401
```

✅ **Status:** PASSED

---

### Test 2: With Invalid Token (401 Unauthorized)

```bash
curl -X GET "http://localhost:3001/api/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_here" \
  -w "\n\nHTTP Status: %{http_code}\n"
```

**Expected Response:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "auth_invalid_token"
}

HTTP Status: 401
```

---

### Test 3: With Valid Token - Default Parameters

First, get a valid token by creating a user in Supabase:

```bash
# Option 1: Use Supabase CLI to get anon key (for testing)
# The anon key from .env.example
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Option 2: Create a test user and get their JWT token
# You'll need to implement a registration endpoint first or use Supabase dashboard
```

Once you have a valid token:

```bash
curl -X GET "http://localhost:3001/api/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s
```

**Expected Response:**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

---

### Test 4: With Pagination Parameters

```bash
curl -X GET "http://localhost:3001/api/events?page=2&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s
```

**Expected Response:**
```json
{
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 0,
    "total_pages": 0
  }
}
```

---

### Test 5: With Sorting Parameters

```bash
curl -X GET "http://localhost:3001/api/events?sort=name&order=asc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s
```

---

### Test 6: With Search Parameter

```bash
curl -X GET "http://localhost:3001/api/events?search=wedding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s
```

---

### Test 7: Invalid Limit - Too High (400 Bad Request)

**Note:** This requires authentication first, as auth is checked before validation

```bash
curl -X GET "http://localhost:3001/api/events?limit=500" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n"
```

**Expected Response:**
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must not exceed 100",
      "code": "too_big"
    }
  ]
}

HTTP Status: 400
```

---

### Test 8: Invalid Page - Zero (400 Bad Request)

```bash
curl -X GET "http://localhost:3001/api/events?page=0" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n"
```

**Expected Response:**
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "page",
      "message": "Page must be a positive number",
      "code": "too_small"
    }
  ]
}

HTTP Status: 400
```

---

### Test 9: Invalid Sort Field (400 Bad Request)

```bash
curl -X GET "http://localhost:3001/api/events?sort=invalid_field" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -w "\n\nHTTP Status: %{http_code}\n"
```

**Expected Response:**
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "sort",
      "message": "Sort field must be one of: created_at, updated_at, date, name",
      "code": "invalid_enum_value"
    }
  ]
}

HTTP Status: 400
```

---

### Test 10: Combined Valid Parameters

```bash
curl -X GET "http://localhost:3001/api/events?page=1&limit=50&sort=date&order=desc&search=birthday" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -s
```

---

## Getting a Valid JWT Token for Testing

### Method 1: Using Supabase Local Development

If you have Supabase running locally:

```bash
# Start Supabase
npx supabase start

# The output will show the anon key - use this as your token
# Look for: anon key: eyJ...
```

### Method 2: Create a Test User via API

You'll need to implement the `/api/auth/register` endpoint first (from the API plan), then:

```bash
# Register a test user
curl -X POST "http://localhost:3001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# The response will contain an access_token - use this for testing
```

### Method 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Create a test user
4. Use the Supabase client to get the session token

---

## Testing Workflow

1. **Start the dev server**
2. **Test without auth** (should get 401)
3. **Get a valid token** (using one of the methods above)
4. **Test with valid token** (should get 200 with data)
5. **Test validation errors** (should get 400 with details)

---

## Current Test Results

### ✅ Completed Tests

- **Test 1:** No authentication → 401 Unauthorized ✓

### ⏸️ Pending Tests (Need valid JWT token)

- Test 2-10 require a valid JWT token from Supabase authentication

---

## Next Steps

To fully test the endpoint, you need to either:

1. **Set up Supabase locally:**
   ```bash
   npx supabase init
   npx supabase start
   npx supabase db push
   ```

2. **Or implement the authentication endpoints** from the API plan:
   - POST /api/auth/register
   - POST /api/auth/login

3. **Or use a Supabase project** in the cloud and update .env with real credentials
