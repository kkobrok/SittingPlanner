import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { GenerateSeatingPlanRequestSchema } from "../../../../../validators/seating-plan.validator";
import { SeatingPlanService } from "../../../../../services/seating-plan.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../../../utils/logger";
import { authenticate } from "../../../../../middleware/auth";

/**
 * POST /api/events/{id}/seating-plans/generate
 *
 * Generates an AI-optimized seating plan for an event.
 *
 * Path Parameters:
 * - id: Event ID
 *
 * Request Body:
 * - optimization_factors (optional): Weights for different optimization factors (0-10)
 * - preserve_assignments (optional): Array of guest IDs to keep in current seats
 * - constraints (optional): Must-seat-together and must-separate rules
 *
 * Responses:
 * - 201: Seating plan generated successfully
 * - 400: Validation error or insufficient capacity
 * - 401: Unauthorized
 * - 403: Event does not belong to user
 * - 404: Event not found
 * - 429: Too many requests (rate limit)
 * - 500: Internal server error or AI service unavailable
 */
export const POST: APIRoute = async ({ locals, request, params }) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Get Supabase client from context
    const supabase = locals.supabase;

    // 2. Verify authentication
    const { user, error: authError } = await authenticate(supabase);

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

    // 3. Get event ID from params
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = GenerateSeatingPlanRequestSchema.parse(body);

    // 5. Call seating plan service to generate plan
    const seatingPlanService = new SeatingPlanService(supabase);
    const result = await seatingPlanService.generateSeatingPlan(eventId, user.id, validatedData);

    // 6. Log successful generation
    logInfo({
      request_id: requestId,
      endpoint: `/api/events/${eventId}/seating-plans/generate`,
      method: "POST",
      error_type: "Success",
      error_message: "Seating plan generated successfully",
      user_id: user.id,
      context: {
        event_id: eventId,
        total_guests: result.statistics.total_guests,
        optimization_score: result.optimization_score,
      },
    });

    // 7. Return success response
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
        endpoint: `/api/events/${params.id}/seating-plans/generate`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Seating plan request validation failed",
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

    // Handle specific business logic errors
    if (error instanceof Error) {
      // Event not found
      if (error.message === "EVENT_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Event not found or you do not have permission to access it",
            code: "event_not_found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // No guests
      if (error.message === "NO_GUESTS_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: no guests found for this event",
            code: "no_guests",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // No tables
      if (error.message === "NO_TABLES_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: no tables found for this event",
            code: "no_tables",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Insufficient capacity
      if (error.message === "INSUFFICIENT_TABLE_CAPACITY") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: total table capacity is less than number of guests",
            code: "insufficient_capacity",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // OpenRouter API key not configured
      if (error.message.includes("API key is not configured")) {
        logError({
          request_id: requestId,
          endpoint: `/api/events/${params.id}/seating-plans/generate`,
          method: "POST",
          error_type: "ConfigurationError",
          error_message: "OpenRouter API key not configured",
        });

        return new Response(
          JSON.stringify({
            error: "Service Unavailable",
            message: "AI seating optimization is not configured. Please contact support.",
            code: "ai_service_unavailable",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/seating-plans/generate`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while generating seating plan",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
