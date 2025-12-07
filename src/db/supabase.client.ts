import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "../db/database.types";

// Cloudflare runtime env type
export interface CloudflareRuntimeEnv {
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  [key: string]: string | undefined;
}

// Helper to get environment variables with Cloudflare runtime support
// In Cloudflare Workers, import.meta.env doesn't work at runtime for secrets
// We need to get them from the runtime context passed by middleware
function getEnvVar(name: string, runtimeEnv?: CloudflareRuntimeEnv): string {
  // First try Cloudflare runtime env (passed from middleware)
  if (runtimeEnv && runtimeEnv[name]) {
    return runtimeEnv[name]!;
  }
  // Fallback to import.meta.env (works in dev and build time)
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  if (value) {
    return value;
  }
  return "";
}

// Legacy client - Note: This may not work in Cloudflare production
// Use createSupabaseServerInstance instead for SSR
const supabaseUrl = import.meta.env.SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || "";

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
 *
 * @param context - Request context with headers and cookies
 * @param runtimeEnv - Optional Cloudflare runtime environment variables
 *                     In Cloudflare Workers, import.meta.env doesn't work at runtime
 *                     Pass context.locals.runtime?.env to get env vars
 */
export const createSupabaseServerInstance = (
  context: { headers: Headers; cookies: AstroCookies },
  runtimeEnv?: CloudflareRuntimeEnv
) => {
  const url = getEnvVar("SUPABASE_URL", runtimeEnv);
  const key = getEnvVar("SUPABASE_KEY", runtimeEnv);

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
