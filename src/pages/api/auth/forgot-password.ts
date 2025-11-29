import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { z } from "zod";
import { AuthService } from "../../../services/auth.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

// Validation schema for forgot password request
const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email to the user.
 *
 * IMPORTANT: For security, always returns success even if email doesn't exist.
 * This prevents email enumeration attacks.
 *
 * Request Body:
 * - email (required): User's email address
 *
 * Responses:
 * - 200: Password reset email sent (or would be sent if account exists)
 * - 400: Validation error (invalid email format)
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
    const validatedData = ForgotPasswordSchema.parse(body);

    // 3. Call auth service to send password reset email
    const authService = new AuthService(supabase);
    const result = await authService.requestPasswordReset(validatedData);

    // 4. Log password reset request
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/forgot-password",
      method: "POST",
      error_type: "Success",
      error_message: "Password reset email requested",
      context: sanitizeContext({
        email: validatedData.email,
      }),
    });

    // 5. Return success response (always, for security)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
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
        endpoint: "/api/auth/forgot-password",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Forgot password validation failed",
        context: sanitizeContext({
          validation_errors: details,
        }),
      });

      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid email address",
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
      endpoint: "/api/auth/forgot-password",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while processing your request",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
