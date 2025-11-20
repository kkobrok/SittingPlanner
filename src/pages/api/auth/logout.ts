import type { APIRoute } from "astro";
import { AuthService } from "../../../services/auth.service";
import { logError, logInfo, extractErrorInfo } from "../../../utils/logger";

/**
 * POST /api/auth/logout
 *
 * Terminates the current user session.
 *
 * Headers:
 * - Authorization: Bearer {access_token} (required)
 *
 * Responses:
 * - 200: Logout successful
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
          code: "auth_invalid_token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Call auth service to logout
    const authService = new AuthService(supabase);
    const result = await authService.logout();

    // 4. Log successful logout
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/logout",
      method: "POST",
      error_type: "Success",
      error_message: "User logged out successfully",
      user_id: user.id,
    });

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: "/api/auth/logout",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during logout",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
