import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { z } from "zod";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

// Validation schema for reset password request
const ResetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * POST /api/auth/reset-password
 *
 * Completes the password reset process by setting a new password.
 *
 * IMPORTANT: This endpoint requires a valid password reset token in the session.
 * The token is set when the user clicks the link in the password reset email.
 *
 * Request Body:
 * - password (required): New password (minimum 6 characters)
 *
 * Responses:
 * - 200: Password reset successful
 * - 400: Validation error (invalid password format)
 * - 401: Unauthorized (invalid or expired token)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Create SSR-compatible Supabase client for proper cookie management
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedData = ResetPasswordSchema.parse(body);

    // 3. Update password using Supabase Auth
    // This uses the session token from the email confirmation link
    const { data, error } = await supabase.auth.updateUser({
      password: validatedData.password,
    });

    if (error) {
      // Check if token is invalid or expired
      if (error.message.includes("token") || error.message.includes("session")) {
        logWarning({
          request_id: requestId,
          endpoint: "/api/auth/reset-password",
          method: "POST",
          error_type: "AuthorizationError",
          error_message: "Invalid or expired reset token",
          context: {
            error: error.message,
          },
        });

        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            message: "Invalid or expired password reset link. Please request a new one.",
            code: "invalid_token",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`Password reset failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error("Password reset succeeded but no user returned");
    }

    // 4. Log successful password reset
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/reset-password",
      method: "POST",
      error_type: "Success",
      error_message: "Password reset successful",
      user_id: data.user.id,
    });

    // 5. Return success response
    return new Response(
      JSON.stringify({
        message: "Password reset successfully",
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/reset-password",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Reset password validation failed",
        context: sanitizeContext({
          validation_errors: details,
        }),
      });

      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid password format",
          details,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: "/api/auth/reset-password",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while resetting your password",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
