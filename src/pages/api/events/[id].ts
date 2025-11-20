import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { EventsService } from "../../../services/events.service";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { z } from "zod";
import { authenticate } from "../../../middleware/auth";

/**
 * Validation schema for updating an event
 */
const UpdateEventSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim()
    .optional(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in ISO 8601 format (YYYY-MM-DD)" })
    .optional(),
});

/**
 * GET /api/events/{id}
 *
 * Retrieves a single event by ID for the authenticated user.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Responses:
 * - 200: Success with event data
 * - 400: Invalid event ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // 1. Get Supabase client from context (added by middleware)
    const supabase = locals.supabase;

    // 2. Verify authentication and extract user
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

    // 3. Parse and validate event ID
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

    // 4. Call service layer to fetch event
    const eventsService = new EventsService(supabase);
    const event = await eventsService.getEventById(eventId, user.id);

    if (!event) {
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

    // 5. Return successful response
    return new Response(JSON.stringify(event), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const requestId = crypto.randomUUID();

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    // Log error with full context
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PATCH /api/events/{id}
 *
 * Updates an existing event for the authenticated user.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Request Body (all optional):
 * - name: Event name (max 255 characters)
 * - date: Event date in ISO 8601 format (YYYY-MM-DD)
 *
 * Responses:
 * - 200: Event updated successfully
 * - 400: Validation error or invalid event ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ locals, request, params }) => {
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

    // 3. Parse and validate event ID
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
    const validatedData = UpdateEventSchema.parse(body);

    // 5. Check if there are any fields to update
    if (Object.keys(validatedData).length === 0) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "No fields provided to update",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Update event in database
    const { data: event, error: updateError } = await supabase
      .from("events")
      .update(validatedData)
      .eq("id", eventId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !event) {
      // Check if event doesn't exist or doesn't belong to user
      const { data: existingEvent } = await supabase.from("events").select("id").eq("id", eventId).single();

      if (!existingEvent) {
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

      throw new Error(`Failed to update event: ${updateError?.message}`);
    }

    // 7. Return success response
    return new Response(JSON.stringify(event), {
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
        endpoint: `/api/events/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Event update validation failed",
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

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating event",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/events/{id}
 *
 * Deletes an event and all associated data (guests, tables, relationships, assignments).
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Responses:
 * - 204: Event deleted successfully (no content)
 * - 400: Invalid event ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
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

    // 3. Parse and validate event ID
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

    // 4. Delete event from database (cascade will handle related data)
    const { error: deleteError, count } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw new Error(`Failed to delete event: ${deleteError.message}`);
    }

    // Check if event was found and deleted
    if (count === 0) {
      // Verify if event exists but doesn't belong to user
      const { data: existingEvent } = await supabase.from("events").select("id").eq("id", eventId).single();

      if (!existingEvent) {
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

    // 5. Return success response with no content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting event",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
