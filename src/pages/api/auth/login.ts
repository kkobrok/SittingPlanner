import type { APIRoute } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ZodError } from "zod";
import { LoginRequestSchema } from "../../../validators/auth.validator";
import { AuthService } from "../../../services/auth.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import type { Database } from "../../../db/database.types";

/**
 * POST /api/auth/login
 *
 * Authenticates a user and creates a session.
 *
 * Request Body:
 * - email (required): User's email address
 * - password (required): User's password
 *
 * Responses:
 * - 200: Login successful with session tokens
 * - 400: Validation error (invalid request format)
 * - 401: Unauthorized (invalid credentials)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Use Supabase client from middleware (has Cloudflare runtime env)
    const supabase = locals.supabase as SupabaseClient<Database>;

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedData = LoginRequestSchema.parse(body);

    // 3. Call auth service to authenticate user
    const authService = new AuthService(supabase);
    const result = await authService.login(validatedData);

    // 4. Log successful login
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/login",
      method: "POST",
      error_type: "Success",
      error_message: "User logged in successfully",
      user_id: result.user.id,
      context: sanitizeContext({
        email: validatedData.email,
      }),
    });

    // 5. Return success response
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
        endpoint: "/api/auth/login",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Login validation failed",
        context: sanitizeContext({
          validation_errors: details,
        }),
      });

      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Request validation failed",
          details,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle invalid credentials error
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/login",
        method: "POST",
        error_type: "AuthenticationError",
        error_message: "Invalid login credentials",
        context: {
          note: "Credentials check failed",
        },
      });

      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid email or password",
          code: "invalid_credentials",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: "/api/auth/login",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during login",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
