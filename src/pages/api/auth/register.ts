import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { RegisterRequestSchema } from "../../../validators/auth.validator";
import { AuthService } from "../../../services/auth.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

/**
 * POST /api/auth/register
 *
 * Creates a new user account with email and password.
 *
 * IMPORTANT: Supabase will send a confirmation email to the user.
 * The user must click the link in the email to verify their account.
 *
 * Request Body:
 * - email (required): Valid email address
 * - password (required): Minimum 6 characters
 *
 * Responses:
 * - 201: User created successfully (confirmation email sent)
 * - 400: Validation error (invalid email/password)
 * - 409: Conflict (email already registered)
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
    const validatedData = RegisterRequestSchema.parse(body);

    // 3. Call auth service to register user
    const authService = new AuthService(supabase);
    const result = await authService.register(validatedData);

    // 4. Log successful registration
    logInfo({
      request_id: requestId,
      endpoint: "/api/auth/register",
      method: "POST",
      error_type: "Success",
      error_message: "User registered successfully",
      user_id: result.user.id,
      context: sanitizeContext({
        email: validatedData.email,
      }),
    });

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 201,
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
        endpoint: "/api/auth/register",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Registration validation failed",
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

    // Handle email already exists error
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      logWarning({
        request_id: requestId,
        endpoint: "/api/auth/register",
        method: "POST",
        error_type: "ConflictError",
        error_message: "Email already registered",
        context: {
          error: "Email address is already in use",
        },
      });

      return new Response(
        JSON.stringify({
          error: "Conflict",
          message: "Email address is already registered",
          code: "email_already_exists",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: "/api/auth/register",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during registration",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
