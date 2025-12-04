import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || "";

// Debug: Log environment variable status (only in development or when debugging)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing environment variables:", {
    SUPABASE_URL: supabaseUrl ? "defined" : "MISSING",
    SUPABASE_KEY: supabaseAnonKey ? "defined" : "MISSING",
  });
}

// Legacy client for backward compatibility (use createSupabaseServerInstance for SSR)
// Only create if both values are present to avoid errors
export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null as unknown as ReturnType<typeof createClient<Database>>;

// Cookie options for SSR
// maxAge set to 7 days (in seconds) to ensure cookies persist across page reloads
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
};

// Parse cookie header into array of name-value pairs
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server instance for SSR
 * Use this in middleware and API routes for proper session management
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const url = import.meta.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error(`Missing Supabase environment variables: SUPABASE_URL=${url ? "set" : "MISSING"}, SUPABASE_KEY=${key ? "set" : "MISSING"}`);
  }

  const supabase = createServerClient<Database>(url, key, {
    cookieOptions,
    cookies: {
      getAll() {
        const cookieHeader = context.headers.get("Cookie") ?? "";
        return parseCookieHeader(cookieHeader);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Merge with default cookieOptions to ensure consistent settings
          const mergedOptions = { ...cookieOptions, ...options };
          context.cookies.set(name, value, mergedOptions);
        });
      },
    },
  });

  return supabase;
};
