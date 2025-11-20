import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { ValidateAssignmentImpactRequestSchema } from "../../../../../validators/seating-plan.validator";
import { SeatingPlanService } from "../../../../../services/seating-plan.service";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../../../utils/logger";
import { authenticate } from "../../../../../middleware/auth";

/**
 * POST /api/events/{id}/seating-plans/validate
 *
 * Validates the impact of proposed seating assignment changes.
 * Useful for providing real-time feedback when users manually adjust seating.
 *
 * Path Parameters:
 * - id: Event ID
 *
 * Request Body:
 * - changes: Array of proposed assignment changes (guest_id, from_table_id, to_table_id)
 *
 * Responses:
 * - 200: Validation completed successfully
 * - 400: Validation error (invalid request)
 * - 401: Unauthorized
 * - 403: Event does not belong to user
 * - 404: Event not found
 * - 500: Internal server error
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
    const validatedData = ValidateAssignmentImpactRequestSchema.parse(body);

    // 5. Call seating plan service to validate changes
    const seatingPlanService = new SeatingPlanService(supabase);
    const result = await seatingPlanService.validateAssignmentImpact(eventId, user.id, validatedData);

    // 6. Return success response
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
        endpoint: `/api/events/${params.id}/seating-plans/validate`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Validation request validation failed",
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
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/seating-plans/validate`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while validating assignment changes",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
