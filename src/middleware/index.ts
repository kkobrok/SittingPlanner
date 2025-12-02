/* eslint-disable no-console */
import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance, supabaseClient } from "../db/supabase.client";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  // Landing page
  "/",
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback", // Email confirmation and password reset callback
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

// Static file extensions that should be excluded from auth
const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".json",
  ".xml",
  ".txt",
];

// Helper to check if path is public or static asset
function isPublicPath(pathname: string): boolean {
  // Check if it's a static asset
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }

  // Check if it's in public paths
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, url, request, redirect } = context;

  // Maintain backward compatibility for non-SSR usage
  locals.supabase = supabaseClient;

  // Skip auth check for public paths
  if (isPublicPath(url.pathname)) {
    return next();
  }

  // Check if auth bypass is enabled for development (DISABLE_AUTH=true in .env)
  const disableAuth = import.meta.env.DISABLE_AUTH === "true" || import.meta.env.DISABLE_AUTH === true;

  if (disableAuth) {
    // Development mode - bypass authentication with test user
    console.log("[Middleware] DEVELOPMENT MODE - Authentication bypassed");
    locals.user = {
      id: import.meta.env.E2E_USERNAME_ID || "11ba4a5c-aa20-4777-ae3d-f8efc8eaef99",
      email: import.meta.env.E2E_USERNAME || "e2e@e2e.pl",
    };
    return next();
  }

  // Create SSR-compatible Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // IMPORTANT: Always get user session first before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Store user in locals for access in pages
    locals.user = {
      email: user.email ?? "",
      id: user.id,
    };

    return next();
  } else {
    // Not authenticated - redirect to login
    // Store the intended destination for post-login redirect
    cookies.set("redirect_after_login", url.pathname, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    return redirect("/auth/login");
  }
});
