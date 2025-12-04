import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/db/database.types";

/**
 * Get Supabase configuration from environment variables
 * Read at runtime instead of module load time to ensure GitHub Actions env vars are available
 */
function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    anonKey: process.env.SUPABASE_KEY || "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    serviceKey: process.env.SUPABASE_SERVICE_KEY || "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
  };
}

/**
 * Test user credentials
 */
export interface TestUser {
  email: string;
  password: string;
  id?: string;
}

/**
 * Create a Supabase admin client for user creation only
 * Uses service role key to bypass RLS for creating test users
 */
export function createAdminClient() {
  const config = getSupabaseConfig();
  return createClient<Database>(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an authenticated Supabase client for test data operations
 * This client respects RLS policies, making tests more realistic
 */
export async function createAuthenticatedClient(email: string, password: string) {
  const config = getSupabaseConfig();
  const supabase = createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Sign in as the test user
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("Error signing in test user:", signInError);
    throw new Error(`Failed to authenticate test user: ${signInError.message}`);
  }

  return supabase;
}

/**
 * Create a test user in Supabase Auth
 */
export async function createTestUser(email: string, password: string): Promise<TestUser> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for testing
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("User creation returned no user data");
  }

  return {
    email,
    password,
    id: data.user.id,
  };
}

/**
 * Delete a test user from Supabase Auth
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.error(`Failed to delete test user ${userId}:`, error.message);
  }
}

/**
 * Generate a unique test user email
 */
export function generateTestEmail(prefix = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@example.com`;
}

/**
 * Cleanup all test data for a user
 * Deletes events, guests, tables, assignments, and relationships
 * Uses authenticated client to respect RLS policies
 */
export async function cleanupUserData(email: string, password: string): Promise<void> {
  const supabase = await createAuthenticatedClient(email, password);

  // Get user ID from authenticated session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Failed to get user for cleanup:", userError);
    return;
  }

  const userId = user.id;
  console.log(`[Cleanup] Starting cleanup for user ${userId} (${email})`);

  // First, get all events for this user
  const { data: userEvents } = await supabase.from("events").select("id").eq("user_id", userId);

  const eventIds = userEvents?.map((e) => e.id) || [];
  console.log(`[Cleanup] Found ${eventIds.length} events to clean up`);

  if (eventIds.length === 0) {
    console.log("[Cleanup] No events found, nothing to clean up");
    // Don't sign out - it would invalidate the browser's session
    // await supabase.auth.signOut();
    return;
  }

  // Delete in reverse dependency order to respect foreign key constraints
  // 1. Delete seating assignments (depend on tables and guests)
  const { data: deletedAssignments, error: assignmentsError } = await supabase
    .from("seating_assignments")
    .delete()
    .in("event_id", eventIds)
    .select();

  if (assignmentsError) {
    console.error("[Cleanup] Failed to delete seating assignments:", assignmentsError);
  } else {
    console.log(`[Cleanup] Deleted ${deletedAssignments?.length || 0} seating assignments`);
  }

  // 2. Delete seating plans
  const { data: deletedPlans, error: plansError } = await supabase
    .from("seating_plans")
    .delete()
    .in("event_id", eventIds)
    .select();

  if (plansError) {
    console.error("[Cleanup] Failed to delete seating plans:", plansError);
  } else {
    console.log(`[Cleanup] Deleted ${deletedPlans?.length || 0} seating plans`);
  }

  // 3. Delete guest relationships (we need to get guests first)
  const { data: eventGuests } = await supabase.from("guests").select("id").in("event_id", eventIds);

  const guestIds = eventGuests?.map((g) => g.id) || [];

  if (guestIds.length > 0) {
    const { data: deletedRelationships, error: relationshipsError } = await supabase
      .from("guest_relationships")
      .delete()
      .or(`guest1_id.in.(${guestIds.join(",")}),guest2_id.in.(${guestIds.join(",")})`)
      .select();

    if (relationshipsError) {
      console.error("[Cleanup] Failed to delete guest relationships:", relationshipsError);
    } else {
      console.log(`[Cleanup] Deleted ${deletedRelationships?.length || 0} guest relationships`);
    }
  }

  // 4. Delete guests (depend on events)
  const { data: deletedGuests, error: guestsError } = await supabase
    .from("guests")
    .delete()
    .in("event_id", eventIds)
    .select();

  if (guestsError) {
    console.error("[Cleanup] Failed to delete guests:", guestsError);
  } else {
    console.log(`[Cleanup] Deleted ${deletedGuests?.length || 0} guests`);
  }

  // 5. Delete tables (depend on events)
  const { data: deletedTables, error: tablesError } = await supabase
    .from("tables")
    .delete()
    .in("event_id", eventIds)
    .select();

  if (tablesError) {
    console.error("[Cleanup] Failed to delete tables:", tablesError);
  } else {
    console.log(`[Cleanup] Deleted ${deletedTables?.length || 0} tables`);
  }

  // 6. Finally, delete events
  const { data: deletedEvents, error: eventsError } = await supabase
    .from("events")
    .delete()
    .eq("user_id", userId)
    .select();

  if (eventsError) {
    console.error("[Cleanup] Failed to delete events:", eventsError);
  } else {
    console.log(`[Cleanup] Deleted ${deletedEvents?.length || 0} events`);
  }

  // Verify cleanup was successful
  const { count: remainingEvents } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (remainingEvents && remainingEvents > 0) {
    console.warn(`[Cleanup] Warning: ${remainingEvents} events still remain after cleanup`);
  } else {
    console.log("[Cleanup] Cleanup completed successfully - all data removed");
  }

  // Don't sign out - it would invalidate the browser's session for the same user
  // await supabase.auth.signOut();
}

/**
 * Get a default test user for quick tests
 * Reads from environment variables or uses hardcoded defaults
 */
export function getDefaultTestUser(): TestUser {
  return {
    email: process.env.E2E_USERNAME || process.env.TEST_USER_EMAIL || "e2e@e2e.pl",
    password: process.env.E2E_PASSWORD || process.env.TEST_USER_PASSWORD || "pomidor123",
    id: process.env.E2E_USERNAME_ID || "11ba4a5c-aa20-4777-ae3d-f8efc8eaef99",
  };
}

/**
 * Setup test data for E2E tests
 * Creates events, guests, tables, etc. for a test user
 * Uses authenticated client to respect RLS policies
 *
 * @example
 * const testUser = getDefaultTestUser();
 * const eventId = await setupTestData(testUser.email, testUser.password, {
 *   eventName: 'Test Wedding',
 *   guestCount: 10,
 *   tableCount: 2
 * });
 */
export async function setupTestData(
  email: string,
  password: string,
  options: {
    eventName?: string;
    eventDate?: string;
    guestCount?: number;
    tableCount?: number;
  } = {}
): Promise<string> {
  const supabase = await createAuthenticatedClient(email, password);

  // Get user ID
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();
  if (getUserError || !user) {
    throw new Error(`Failed to get authenticated user: ${getUserError?.message}`);
  }

  const eventName = options.eventName || "Test Event";
  const eventDate = options.eventDate || new Date().toISOString().split("T")[0];

  console.log(`[Setup] Creating test data for user ${user.id} (${email})`);
  console.log(`[Setup] Event: ${eventName}, Date: ${eventDate}`);

  // Create event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name: eventName,
      date: eventDate,
    })
    .select()
    .single();

  if (eventError || !event) {
    console.error("[Setup] Failed to create event:", eventError);
    throw new Error(`Failed to create test event: ${eventError?.message}`);
  }

  console.log(`[Setup] Created event with ID: ${event.id}`);

  // Create tables if specified
  if (options.tableCount) {
    const tables = Array.from({ length: options.tableCount }, (_, i) => ({
      event_id: event.id,
      name: `Table ${i + 1}`,
      capacity: 8,
      table_type: "round" as const,
    }));

    const { error: tablesError, count } = await supabase
      .from("tables")
      .insert(tables)
      .select("*", { count: "exact", head: true });

    if (tablesError) {
      console.error("[Setup] Failed to create test tables:", tablesError);
    } else {
      console.log(`[Setup] Created ${count || options.tableCount} tables`);
    }
  }

  // Create guests if specified
  if (options.guestCount) {
    const guests = Array.from({ length: options.guestCount }, (_, i) => ({
      event_id: event.id,
      name: `Guest ${i + 1}`,
    }));

    const { error: guestsError, count } = await supabase
      .from("guests")
      .insert(guests)
      .select("*", { count: "exact", head: true });

    if (guestsError) {
      console.error("[Setup] Failed to create test guests:", guestsError);
    } else {
      console.log(`[Setup] Created ${count || options.guestCount} guests`);
    }
  }

  // Verify the event was created and is retrievable
  const { data: verifyEvent, error: verifyError } = await supabase
    .from("events")
    .select("id, name, date, user_id")
    .eq("id", event.id)
    .single();

  if (verifyError || !verifyEvent) {
    console.error("[Setup] Failed to verify event creation:", verifyError);
  } else {
    console.log(`[Setup] Verified event exists: ${verifyEvent.name} (ID: ${verifyEvent.id})`);
  }

  // Don't sign out - keep the session alive for the browser test
  // await supabase.auth.signOut();

  return event.id;
}

/**
 * Create event using the browser's session (via fetch within page context)
 * This ensures the event is created with the same session the browser is using
 */
export async function createEventViaBrowser(page: any, eventData: { name: string; date: string }): Promise<number> {
  const result = await page.evaluate(async (data: { name: string; date: string }) => {
    // Debug: Log document.cookie to see what's available in browser (won't show httpOnly cookies)
    console.log("[Browser] document.cookie (non-httpOnly only):", document.cookie);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "same-origin", // Explicitly include cookies
    });

    // Log response details for debugging
    console.log(`[Browser] POST /api/events response status: ${res.status}`);
    console.log(`[Browser] Content-Type: ${res.headers.get("content-type")}`);

    // Get response text first
    const responseText = await res.text();

    if (!res.ok) {
      console.log(`[Browser] Error response body: ${responseText.substring(0, 500)}`);

      // Try to parse error response to show debug info
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.debug) {
          console.log(`[Browser] Debug info:`, JSON.stringify(errorData.debug, null, 2));
        }
      } catch (e) {
        // Ignore parse errors
      }

      throw new Error(`Failed to create event: ${res.status} - ${responseText.substring(0, 200)}`);
    }

    // Check if response is actually JSON
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log(`[Browser] Unexpected content type. Response body: ${responseText.substring(0, 500)}`);
      throw new Error(`Expected JSON response but got ${contentType}. Body: ${responseText.substring(0, 200)}`);
    }

    // Parse JSON
    try {
      const event = JSON.parse(responseText);
      return event.id;
    } catch (parseError) {
      console.log(`[Browser] JSON parse error. Response body: ${responseText.substring(0, 500)}`);
      throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }, eventData);

  console.log(`[Browser] Created event with ID: ${result}`);
  return result;
}
