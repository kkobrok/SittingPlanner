/* eslint-disable no-console */
/**
 * Test Setup Helpers
 *
 * Utilities for setting up test environment, creating test users,
 * and managing test data
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";

/**
 * Test configuration
 */
const TEST_CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || "http://localhost:54321",
  supabaseKey:
    process.env.SUPABASE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001",
};

/**
 * Test user credentials and data
 */
export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  client: SupabaseClient<Database>;
}

/**
 * Create a test Supabase client
 */
export function createTestClient(): SupabaseClient<Database> {
  return createClient<Database>(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
}

/**
 * Create a test user and return authentication credentials
 *
 * @param email Optional custom email (generates random if not provided)
 * @param password Optional custom password
 * @returns Test user object with credentials and authenticated client
 */
export async function createTestUser(email?: string, password = "TestPassword123!"): Promise<TestUser> {
  const client = createTestClient();

  // Generate random email if not provided
  const testEmail = email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;

  // Create user via Supabase Auth
  const { data, error } = await client.auth.signUp({
    email: testEmail,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  return {
    id: data.user.id,
    email: testEmail,
    password,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    client,
  };
}

/**
 * Sign in as an existing test user
 */
export async function signInTestUser(email: string, password: string): Promise<TestUser> {
  const client = createTestClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(`Failed to sign in test user: ${error?.message}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    client,
  };
}

/**
 * Clean up all data for a test user
 */
export async function cleanupTestData(userId: string): Promise<void> {
  const client = createTestClient();

  // Delete all events (cascading deletes will handle related data)
  await client.from("events").delete().eq("user_id", userId);

  // Delete the test user
  // Note: This requires admin privileges in Supabase
  // In local development with Supabase CLI, this should work
  // In production, you may need to use the Admin API
  try {
    await client.auth.admin.deleteUser(userId);
  } catch (error) {
    console.warn("Could not delete test user (may require admin privileges):", error);
  }
}

/**
 * Create test events for a user
 */
export async function createTestEvents(
  userId: string,
  count: number,
  client?: SupabaseClient<Database>
): Promise<{ id: number; name: string; date: string }[]> {
  const supabase = client || createTestClient();
  const events = [];

  for (let i = 0; i < count; i++) {
    const event = {
      user_id: userId,
      name: `Test Event ${i + 1}`,
      date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0], // Different dates
    };

    const { data, error } = await supabase.from("events").insert(event).select().single();

    if (error) {
      throw new Error(`Failed to create test event: ${error.message}`);
    }

    events.push(data);
  }

  return events;
}

/**
 * Create test events with specific names
 */
export async function createTestEventsWithNames(
  userId: string,
  names: string[],
  client?: SupabaseClient<Database>
): Promise<{ id: number; name: string; date: string }[]> {
  const supabase = client || createTestClient();
  const events = [];

  for (const name of names) {
    const event = {
      user_id: userId,
      name,
      date: new Date(Date.now()).toISOString().split("T")[0],
    };

    const { data, error } = await supabase.from("events").insert(event).select().single();

    if (error) {
      throw new Error(`Failed to create test event: ${error.message}`);
    }

    events.push(data);
  }

  return events;
}

/**
 * Create an event with guests, tables, and assignments
 */
export async function createTestEventWithData(
  userId: string,
  config: {
    eventName?: string;
    guestCount: number;
    tableCount: number;
    assignedCount: number;
  },
  client?: SupabaseClient<Database>
): Promise<number> {
  const supabase = client || createTestClient();

  // Create event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      user_id: userId,
      name: config.eventName || "Test Event with Data",
      date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (eventError || !event) {
    throw new Error(`Failed to create event: ${eventError?.message}`);
  }

  // Create guests
  const guests = [];
  for (let i = 0; i < config.guestCount; i++) {
    const { data, error } = await supabase
      .from("guests")
      .insert({
        event_id: event.id,
        name: `Guest ${i + 1}`,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create guest: ${error.message}`);
    guests.push(data);
  }

  // Create tables
  const tables = [];
  for (let i = 0; i < config.tableCount; i++) {
    const { data, error } = await supabase
      .from("tables")
      .insert({
        event_id: event.id,
        name: `Table ${i + 1}`,
        capacity: 10,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create table: ${error.message}`);
    tables.push(data);
  }

  // Create seating assignments
  for (let i = 0; i < Math.min(config.assignedCount, guests.length); i++) {
    const tableIndex = i % tables.length;
    await supabase.from("seating_assignments").insert({
      event_id: event.id,
      guest_id: guests[i].id,
      table_id: tables[tableIndex].id,
    });
  }

  return event.id;
}

/**
 * Make an authenticated API request
 */
export async function makeAuthenticatedRequest(path: string, token: string, options?: RequestInit): Promise<Response> {
  return fetch(`${TEST_CONFIG.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
