globalThis.process ??= {}; globalThis.process.env ??= {};
import { U as UpdateAssignmentSchema } from '../../../chunks/assignments.validator_BSrpN9dL.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../chunks/auth_COeveCsX.mjs';
import { Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const PATCH = async ({ locals, request, params }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = locals.supabase;
    const { user, error: authError } = await authenticate(supabase);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
          code: "auth_invalid_token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const assignmentId = parseInt(params.id || "0", 10);
    if (!assignmentId || isNaN(assignmentId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid assignment ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const validatedData = UpdateAssignmentSchema.parse(body);
    const { data: existingAssignment } = await supabase.from("seating_assignments").select(
      `
        id,
        event_id,
        table_id,
        events!inner (
          user_id
        )
      `
    ).eq("id", assignmentId).single();
    if (!existingAssignment) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingAssignment.events) ? existingAssignment.events[0] : existingAssignment.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const targetTableId = validatedData.table_id || existingAssignment.table_id;
    const { data: table } = await supabase.from("tables").select("id, capacity").eq("id", targetTableId).eq("event_id", existingAssignment.event_id).single();
    if (!table) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found in this event",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    if (validatedData.seat_position !== void 0 && validatedData.seat_position !== null) {
      if (validatedData.seat_position > table.capacity) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Seat position ${validatedData.seat_position} exceeds table capacity of ${table.capacity}`,
            code: "seat_exceeds_capacity"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      const { data: existingSeat } = await supabase.from("seating_assignments").select("id, guest_id").eq("table_id", targetTableId).eq("seat_position", validatedData.seat_position).maybeSingle();
      if (existingSeat && existingSeat.id !== assignmentId) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: `Seat ${validatedData.seat_position} is already occupied by another guest`,
            code: "seat_already_taken"
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    if (validatedData.table_id && validatedData.table_id !== existingAssignment.table_id && !validatedData.seat_position) {
      const { count: assignedCount } = await supabase.from("seating_assignments").select("*", { count: "exact", head: true }).eq("table_id", validatedData.table_id);
      if ((assignedCount || 0) >= table.capacity) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Table is at full capacity",
            code: "table_full"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    const { data: assignment, error: updateError } = await supabase.from("seating_assignments").update(validatedData).eq("id", assignmentId).select().single();
    if (updateError || !assignment) {
      throw new Error(`Failed to update assignment: ${updateError?.message}`);
    }
    return new Response(JSON.stringify(assignment), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: `/api/assignments/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Assignment update validation failed",
        context: sanitizeContext({
          validation_errors: details
        })
      });
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Request validation failed",
          details
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/assignments/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating assignment",
        request_id: requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const DELETE = async ({ locals, params }) => {
  const requestId = crypto.randomUUID();
  try {
    const supabase = locals.supabase;
    const { user, error: authError } = await authenticate(supabase);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
          code: "auth_invalid_token"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const assignmentId = parseInt(params.id || "0", 10);
    if (!assignmentId || isNaN(assignmentId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid assignment ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: existingAssignment } = await supabase.from("seating_assignments").select(
      `
        id,
        events!inner (
          user_id
        )
      `
    ).eq("id", assignmentId).single();
    if (!existingAssignment) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingAssignment.events) ? existingAssignment.events[0] : existingAssignment.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Assignment not found or you do not have permission to access it",
          code: "assignment_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { error: deleteError } = await supabase.from("seating_assignments").delete().eq("id", assignmentId);
    if (deleteError) {
      throw new Error(`Failed to delete assignment: ${deleteError.message}`);
    }
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/assignments/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting assignment",
        request_id: requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  DELETE,
  PATCH
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
