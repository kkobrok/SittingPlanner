/* eslint-disable @typescript-eslint/no-unused-vars */
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  ListAssignmentsQuerySchema,
  CreateAssignmentSchema,
  BulkUpdateAssignmentsSchema,
} from "../../../../validators/assignments.validator";
import { AssignmentsService } from "../../../../services/assignments.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../../utils/logger";
import { authenticate } from "../../../../middleware/auth";

/**
 * GET /api/events/{id}/assignments
 *
 * Retrieves all seating assignments for a specific event.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Query Parameters:
 * - table_id (optional): Filter by specific table ID
 * - guest_id (optional): Filter by specific guest ID
 *
 * Responses:
 * - 200: Success with assignments list
 * - 400: Validation error or invalid event ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, request, params }) => {
  try {
    // 1. Get Supabase client from context
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

    // 4. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string | null> = {
      table_id: url.searchParams.get("table_id"),
      guest_id: url.searchParams.get("guest_id"),
    };

    // Filter out null values
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));

    // Validate using Zod schema
    const validatedQuery = ListAssignmentsQuerySchema.parse(filteredParams);

    // 5. Call service layer to fetch assignments
    const assignmentsService = new AssignmentsService(supabase);
    const result = await assignmentsService.listAssignmentsForEvent(eventId, user.id, validatedQuery);

    // 6. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const requestId = crypto.randomUUID();

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      logWarning({
        request_id: requestId,
        endpoint: `/api/events/${params.id}/assignments`,
        method: "GET",
        error_type: "ValidationError",
        error_message: "Request validation failed",
        context: sanitizeContext({
          validation_errors: details,
          url: request.url,
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
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
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

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
      context: sanitizeContext({
        url: request.url,
      }),
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
 * POST /api/events/{id}/assignments
 *
 * Creates a new seating assignment or bulk updates assignments.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Request Body (Single Assignment):
 * - guest_id (required): Guest ID
 * - table_id (required): Table ID
 *
 * Request Body (Bulk Update):
 * - assignments (required): Array of assignment objects (max 200)
 *
 * Responses:
 * - 201: Assignment(s) created successfully
 * - 400: Validation error or table full
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event, guest, or table not found
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
    const isBulk = "assignments" in body && Array.isArray(body.assignments);

    const assignmentsService = new AssignmentsService(supabase);

    if (isBulk) {
      // Bulk update
      const validatedData = BulkUpdateAssignmentsSchema.parse(body);
      const result = await assignmentsService.bulkUpdateAssignments(eventId, user.id, validatedData);

      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/assignments`,
        method: "POST",
        error_type: "Success",
        error_message: "Bulk assignments updated successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          assignments_updated: result.updated,
        },
      });

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      // Single create
      const validatedData = CreateAssignmentSchema.parse(body);
      const assignment = await assignmentsService.createAssignment(eventId, user.id, validatedData);

      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/assignments`,
        method: "POST",
        error_type: "Success",
        error_message: "Assignment created successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          assignment_id: assignment.id,
        },
      });

      return new Response(JSON.stringify(assignment), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
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
        endpoint: `/api/events/${params.id}/assignments`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Assignment creation validation failed",
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

      if (error.message === "GUEST_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Guest not found in this event",
            code: "guest_not_found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error.message === "TABLE_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Table not found in this event",
            code: "table_not_found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error.message === "TABLE_FULL") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Table is at full capacity",
            code: "table_full",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error.message.startsWith("SEAT_EXCEEDS_CAPACITY:")) {
        const capacity = error.message.split(":")[1];
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Seat position exceeds table capacity of ${capacity}`,
            code: "seat_exceeds_capacity",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (error.message === "SEAT_ALREADY_TAKEN") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "This seat is already occupied by another guest",
            code: "seat_already_taken",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating assignment(s)",
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
 * DELETE /api/events/{id}/assignments
 *
 * Clears all seating assignments for an event.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Responses:
 * - 200: Assignments cleared successfully
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

    // 4. Clear all assignments
    const assignmentsService = new AssignmentsService(supabase);
    const result = await assignmentsService.clearAllAssignments(eventId, user.id);

    logInfo({
      request_id: requestId,
      endpoint: `/api/events/${eventId}/assignments`,
      method: "DELETE",
      error_type: "Success",
      error_message: "Assignments cleared successfully",
      user_id: user.id,
      context: {
        event_id: eventId,
        deleted_count: result.deleted,
      },
    });

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
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

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while clearing assignments",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
