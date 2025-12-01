/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

/**
 * Authentication Helper Middleware
 *
 * Centralizes authentication logic with support for bypassing auth in development.
 *
 * DEVELOPMENT MODE:
 * - Set DISABLE_AUTH=true in .env to bypass authentication
 * - Returns a mock test user instead of validating tokens
 * - Useful for local development and testing
 *
 * PRODUCTION MODE:
 * - Set DISABLE_AUTH=false or omit the variable
 * - Performs normal Supabase authentication
 * - Validates JWT tokens and user sessions
 *
 * @example
 * ```typescript
 * // In API route
 * const { user, error: authError } = await authenticate(supabase);
 * if (authError || !user) {
 *   return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
 * }
 * ```
 */

/**
 * User object returned by authentication
 */
export interface AuthUser {
  id: string;
  email?: string;
  [key: string]: any;
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: AuthUser | null;
  error: Error | null;
}

/**
 * Default test user for development mode
 *
 * This user ID corresponds to the test user in local Supabase:
 * - Email: testuser@example.com
 * - ID: e98fe906-d4e5-4151-b470-c1b1b2418723 (from registered test user)
 */
const DEV_TEST_USER: AuthUser = {
  id: "e98fe906-d4e5-4151-b470-c1b1b2418723",
  email: "testuser@example.com",
  aud: "authenticated",
  role: "authenticated",
};

/**
 * Authenticate user with optional bypass for development
 *
 * Checks the DISABLE_AUTH environment variable:
 * - If "true": Returns mock test user (development mode)
 * - Otherwise: Performs normal Supabase authentication (production mode)
 *
 * @param supabase - Supabase client instance
 * @returns Authentication result with user or error
 *
 * @example
 * ```typescript
 * const { user, error } = await authenticate(supabase);
 * if (error || !user) {
 *   return new Response(JSON.stringify({
 *     error: "Unauthorized",
 *     message: "Invalid or expired token"
 *   }), { status: 401 });
 * }
 * ```
 */
export async function authenticate(supabase: SupabaseClient<Database>): Promise<AuthResult> {
  // Check if auth bypass is enabled (handle both boolean and string)
  const disableAuth = import.meta.env.DISABLE_AUTH === "true" || import.meta.env.DISABLE_AUTH === true;
  console.log("[Auth] DISABLE_AUTH env var:", import.meta.env.DISABLE_AUTH, "=> disableAuth:", disableAuth);

  if (disableAuth) {
    console.log("[Auth] DEVELOPMENT MODE - Authentication bypassed, using test user");
    return {
      user: DEV_TEST_USER,
      error: null,
    };
  }

  console.log("[Auth] PRODUCTION MODE - Checking actual authentication");

  // Production mode - normal authentication
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        user: null,
        error: error as Error,
      };
    }

    return {
      user: user as AuthUser | null,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error("Authentication failed"),
    };
  }
}

/**
 * Check if authentication is currently bypassed
 *
 * @returns True if DISABLE_AUTH is enabled, false otherwise
 */
export function isAuthBypass(): boolean {
  return import.meta.env.DISABLE_AUTH === "true" || import.meta.env.DISABLE_AUTH === true;
}

/**
 * Get the current authentication mode
 *
 * @returns "development" or "production"
 */
export function getAuthMode(): "development" | "production" {
  return isAuthBypass() ? "development" : "production";
}
