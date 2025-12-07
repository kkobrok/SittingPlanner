globalThis.process ??= {}; globalThis.process.env ??= {};
import { L as ListAssignmentsQuerySchema, B as BulkUpdateAssignmentsSchema, C as CreateAssignmentSchema } from '../../../../chunks/assignments.validator_BSrpN9dL.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError, b as logInfo } from '../../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../../chunks/auth_COeveCsX.mjs';
import { Z as ZodError } from '../../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

class AssignmentsService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Retrieves all seating assignments for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering
   * @returns List of assignments with guest and table details
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listAssignmentsForEvent(eventId, userId, query) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    let dataQuery = this.supabase.from("seating_assignments").select(
      `
        id,
        event_id,
        guest_id,
        table_id,
        seat_position,
        guests (id, name),
        tables (id, name)
      `
    ).eq("event_id", eventId);
    if (query.table_id) {
      dataQuery = dataQuery.eq("table_id", query.table_id);
    }
    if (query.guest_id) {
      dataQuery = dataQuery.eq("guest_id", query.guest_id);
    }
    const { data: assignments, error: assignmentsError } = await dataQuery;
    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }
    const assignmentsWithDetails = assignments?.map((a) => ({
      id: a.id,
      event_id: a.event_id,
      guest: {
        id: a.guest_id,
        name: Array.isArray(a.guests) ? a.guests[0]?.name || "" : a.guests?.name || ""
      },
      table: {
        id: a.table_id,
        name: Array.isArray(a.tables) ? a.tables[0]?.name || "" : a.tables?.name || ""
      },
      seat_position: a.seat_position
    })) || [];
    return {
      data: assignmentsWithDetails
    };
  }
  /**
   * Creates a new seating assignment
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param assignmentData - Assignment data to create
   * @returns Created assignment
   * @throws Error if database query fails
   */
  async createAssignment(eventId, userId, assignmentData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const { data: guest } = await this.supabase.from("guests").select("id").eq("id", assignmentData.guest_id).eq("event_id", eventId).single();
    if (!guest) {
      throw new Error("GUEST_NOT_FOUND");
    }
    const { data: table } = await this.supabase.from("tables").select("id, capacity").eq("id", assignmentData.table_id).eq("event_id", eventId).single();
    if (!table) {
      throw new Error("TABLE_NOT_FOUND");
    }
    if (assignmentData.seat_position !== void 0 && assignmentData.seat_position !== null) {
      if (assignmentData.seat_position > table.capacity) {
        throw new Error(`SEAT_EXCEEDS_CAPACITY:${table.capacity}`);
      }
      const { data: existingSeat } = await this.supabase.from("seating_assignments").select("id, guest_id").eq("table_id", assignmentData.table_id).eq("seat_position", assignmentData.seat_position).maybeSingle();
      if (existingSeat && existingSeat.guest_id !== assignmentData.guest_id) {
        throw new Error("SEAT_ALREADY_TAKEN");
      }
    }
    if (!assignmentData.seat_position) {
      const { count: assignedCount } = await this.supabase.from("seating_assignments").select("*", { count: "exact", head: true }).eq("table_id", assignmentData.table_id);
      if ((assignedCount || 0) >= table.capacity) {
        throw new Error("TABLE_FULL");
      }
    }
    const { data: assignment, error: createError } = await this.supabase.from("seating_assignments").upsert({
      event_id: eventId,
      ...assignmentData
    }).select().single();
    if (createError) {
      throw new Error(`Failed to create assignment: ${createError.message}`);
    }
    return assignment;
  }
  /**
   * Creates or updates multiple assignments in bulk
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param bulkData - Bulk assignment data
   * @returns Summary of updated assignments
   * @throws Error if database query fails
   */
  async bulkUpdateAssignments(eventId, userId, bulkData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const assignmentsToUpsert = bulkData.assignments.map((a) => ({
      event_id: eventId,
      ...a
    }));
    const { data: updatedAssignments, error: upsertError } = await this.supabase.from("seating_assignments").upsert(assignmentsToUpsert).select();
    if (upsertError) {
      throw new Error(`Failed to update assignments: ${upsertError.message}`);
    }
    return {
      updated: updatedAssignments?.length || 0,
      optimization_impact: {
        overall_score: 0,
        // Placeholder - would calculate based on relationships
        conflicts: []
      }
    };
  }
  /**
   * Clears all seating assignments for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @returns Summary of deleted assignments
   * @throws Error if database query fails
   */
  async clearAllAssignments(eventId, userId) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const { count } = await this.supabase.from("seating_assignments").select("*", { count: "exact", head: true }).eq("event_id", eventId);
    const { error: deleteError } = await this.supabase.from("seating_assignments").delete().eq("event_id", eventId);
    if (deleteError) {
      throw new Error(`Failed to clear assignments: ${deleteError.message}`);
    }
    return {
      deleted: count || 0,
      message: `Successfully cleared ${count || 0} seating assignments`
    };
  }
}

const GET = async ({ locals, request, params }) => {
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
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const url = new URL(request.url);
    const queryParams = {
      table_id: url.searchParams.get("table_id"),
      guest_id: url.searchParams.get("guest_id")
    };
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));
    const validatedQuery = ListAssignmentsQuerySchema.parse(filteredParams);
    const assignmentsService = new AssignmentsService(supabase);
    const result = await assignmentsService.listAssignmentsForEvent(eventId, user.id, validatedQuery);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: `/api/events/${params.id}/assignments`,
        method: "GET",
        error_type: "ValidationError",
        error_message: "Request validation failed",
        context: sanitizeContext({
          validation_errors: details,
          url: request.url
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
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
      context: sanitizeContext({
        url: request.url
      })
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        request_id: requestId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const POST = async ({ locals, request, params }) => {
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
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const isBulk = "assignments" in body && Array.isArray(body.assignments);
    const assignmentsService = new AssignmentsService(supabase);
    if (isBulk) {
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
          assignments_updated: result.updated
        }
      });
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } else {
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
          assignment_id: assignment.id
        }
      });
      return new Response(JSON.stringify(assignment), {
        status: 201,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: `/api/events/${params.id}/assignments`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Assignment creation validation failed",
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
    if (error instanceof Error) {
      if (error.message === "EVENT_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Event not found or you do not have permission to access it",
            code: "event_not_found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "GUEST_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Guest not found in this event",
            code: "guest_not_found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "TABLE_NOT_FOUND") {
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
      if (error.message === "TABLE_FULL") {
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
      if (error.message.startsWith("SEAT_EXCEEDS_CAPACITY:")) {
        const capacity = error.message.split(":")[1];
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: `Seat position exceeds table capacity of ${capacity}`,
            code: "seat_exceeds_capacity"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "SEAT_ALREADY_TAKEN") {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "This seat is already occupied by another guest",
            code: "seat_already_taken"
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating assignment(s)",
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
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
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
        deleted_count: result.deleted
      }
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/assignments`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while clearing assignments",
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
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
