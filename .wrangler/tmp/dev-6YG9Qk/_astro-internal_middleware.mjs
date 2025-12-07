globalThis.process ??= {}; globalThis.process.env ??= {};
import { d as defineMiddleware, s as sequence } from './chunks/index_BDI0SvAH.mjs';
import { c as createSupabaseServerInstance } from './chunks/supabase.client_RZyWin4j.mjs';
import './chunks/astro-designed-error-pages_SRM-C9y8.mjs';
import './chunks/astro/server_D4BVXBCg.mjs';
import './chunks/index_B7Oa2Wn_.mjs';

const PUBLIC_PATHS = [
  // Landing page
  "/",
  // Health check (minimal page for debugging)
  "/healthcheck",
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
  // Email confirmation and password reset callback
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password"
];
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
  ".txt"
];
function isPublicPath(pathname) {
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}
const onRequest$2 = defineMiddleware(async (context, next) => {
  const { locals, cookies, url, request, redirect } = context;
  try {
    if (url.pathname === "/dashboard") {
      const cookieHeader = request.headers.get("cookie");
      console.log(`[Middleware] Dashboard request - Cookie header:`, cookieHeader);
    }
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers
    });
    locals.supabase = supabase;
    if (isPublicPath(url.pathname)) {
      return next();
    }
    const disableAuth = false;
    if (disableAuth) ;
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (url.pathname.startsWith("/api/events")) {
      console.log(`[Middleware] ${request.method} ${url.pathname}`);
      console.log(`[Middleware] User found: ${!!user}`);
      console.log(`[Middleware] Auth error: ${authError?.message || "none"}`);
      const cookieHeader = request.headers.get("cookie");
      console.log(`[Middleware] Cookie header present: ${!!cookieHeader}`);
      console.log(`[Middleware] Cookie header length: ${cookieHeader?.length || 0}`);
      if (cookieHeader) {
        console.log(`[Middleware] Cookie preview: ${cookieHeader.substring(0, 150)}...`);
      }
    }
    if (user) {
      locals.user = {
        email: user.email ?? "",
        id: user.id
      };
      return next();
    } else {
      console.log(`[Middleware] No user found for ${request.method} ${url.pathname}, redirecting to login`);
      if (url.pathname.startsWith("/api/")) {
        const cookieHeader = request.headers.get("cookie");
        const cookieNames = cookieHeader ? cookieHeader.split(";").map((c) => c.trim().split("=")[0]).join(", ") : "none";
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Authentication required",
            code: "auth_required",
            debug: {
              path: url.pathname,
              method: request.method,
              hasCookies: !!cookieHeader,
              cookieLength: cookieHeader?.length || 0,
              cookieNames,
              cookiePreview: cookieHeader?.substring(0, 100) || "none",
              authError: authError?.message || null
            }
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      cookies.set("redirect_after_login", url.pathname, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 10
        // 10 minutes
      });
      return redirect("/auth/login");
    }
  } catch (error) {
    console.error("[Middleware] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    return new Response(
      `<!DOCTYPE html><html><head><title>Server Error</title></head><body>
        <h1>Server Error</h1>
        <p><strong>Message:</strong> ${errorMessage}</p>
        <pre>${errorStack}</pre>
        <p><strong>SUPABASE_URL defined:</strong> ${!!process.env.SUPABASE_URL}</p>
        <p><strong>SUPABASE_KEY defined:</strong> ${!!process.env.SUPABASE_KEY}</p>
      </body></html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
});

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	onRequest$2
	
);

export { onRequest };
