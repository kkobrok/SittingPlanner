import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { UpdateAssignmentSchema } from "../../../validators/assignments.validator";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { authenticate } from "../../../middleware/auth";

/**
 * PATCH /api/assignments/{id}
 *
 * Updates an existing seating assignment (moves a guest to a different table).
 *
 * Path Parameters:
 * - id: Assignment ID (integer)
 *
 * Request Body:
 * - table_id (required): New table ID
 *
 * Responses:
 * - 200: Assignment updated successfully
 * - 400: Validation error, invalid assignment ID, or table full
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Assignment or table not found
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

    // 3. Parse and validate assignment ID
    const assignmentId = parseInt(params.id || "0", 10);
    if (!assignmentId || isNaN(assignmentId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid assignment ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateAssignmentSchema.parse(body);

    // 5. Fetch assignment to check authorization
    const { data: existingAssignment } = await supabase
      .from("seating_assignments")
      .select(
        `
        id,
        event_id,
        table_id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", assignmentId)
      .single();

    if (!existingAssignment) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingAssignment.events)
      ? existingAssignment.events[0]
      : existingAssignment.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Get table information (needed for both table change and seat validation)
    const targetTableId = validatedData.table_id || existingAssignment.table_id;
    const { data: table } = await supabase
      .from("tables")
      .select("id, capacity")
      .eq("id", targetTableId)
      .eq("event_id", existingAssignment.event_id)
      .single();

    if (!table) {
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

    // 7. Validate seat_position if provided
    if (validatedData.seat_position !== undefined && validatedData.seat_position !== null) {
      // Check seat_position is within table capacity
      if (validatedData.seat_position > table.capacity) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Seat position ${validatedData.seat_position} exceeds table capacity of ${table.capacity}`,
            code: "seat_exceeds_capacity",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if seat is already taken (by a different guest)
      const { data: existingSeat } = await supabase
        .from("seating_assignments")
        .select("id, guest_id")
        .eq("table_id", targetTableId)
        .eq("seat_position", validatedData.seat_position)
        .maybeSingle();

      if (existingSeat && existingSeat.id !== assignmentId) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: `Seat ${validatedData.seat_position} is already occupied by another guest`,
            code: "seat_already_taken",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // 8. Check table capacity if changing tables (and not assigning specific seat)
    if (validatedData.table_id && validatedData.table_id !== existingAssignment.table_id && !validatedData.seat_position) {
      const { count: assignedCount } = await supabase
        .from("seating_assignments")
        .select("*", { count: "exact", head: true })
        .eq("table_id", validatedData.table_id);

      if ((assignedCount || 0) >= table.capacity) {
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
    }

    // 9. Update assignment in database
    const { data: assignment, error: updateError } = await supabase
      .from("seating_assignments")
      .update(validatedData)
      .eq("id", assignmentId)
      .select()
      .single();

    if (updateError || !assignment) {
      throw new Error(`Failed to update assignment: ${updateError?.message}`);
    }

    // 10. Return success response
    return new Response(JSON.stringify(assignment), {
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
        endpoint: `/api/assignments/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Assignment update validation failed",
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
      endpoint: `/api/assignments/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating assignment",
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
 * DELETE /api/assignments/{id}
 *
 * Deletes a seating assignment (removes a guest from their table).
 *
 * Path Parameters:
 * - id: Assignment ID (integer)
 *
 * Responses:
 * - 204: Assignment deleted successfully (no content)
 * - 400: Invalid assignment ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Assignment not found or user does not have access
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

    // 3. Parse and validate assignment ID
    const assignmentId = parseInt(params.id || "0", 10);
    if (!assignmentId || isNaN(assignmentId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid assignment ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch assignment to check authorization
    const { data: existingAssignment } = await supabase
      .from("seating_assignments")
      .select(
        `
        id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", assignmentId)
      .single();

    if (!existingAssignment) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingAssignment.events)
      ? existingAssignment.events[0]
      : existingAssignment.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Delete assignment from database
    const { error: deleteError } = await supabase.from("seating_assignments").delete().eq("id", assignmentId);

    if (deleteError) {
      throw new Error(`Failed to delete assignment: ${deleteError.message}`);
    }

    // 6. Return success response with no content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/assignments/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting assignment",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
