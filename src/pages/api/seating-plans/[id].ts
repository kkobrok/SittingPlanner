/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import type { APIRoute } from "astro";
import { logError, logWarning, extractErrorInfo } from "../../../utils/logger";
import { authenticate } from "../../../middleware/auth";

/**
 * GET /api/seating-plans/{id}
 *
 * Retrieves a previously generated seating plan by its ID.
 *
 * Path Parameters:
 * - id: Plan ID (UUID)
 *
 * Responses:
 * - 200: Seating plan retrieved successfully
 * - 401: Unauthorized
 * - 403: Plan does not belong to user's event
 * - 404: Plan not found
 * - 500: Internal server error
 *
 * Note: This endpoint retrieves the current state of assignments for an event.
 * Since we don't store historical plans in the current schema, we fetch
 * the current assignments and reconstruct the plan data.
 */
export const GET: APIRoute = async ({ locals, params }) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = locals.supabase;

    // Authenticate
    const { user, error: authError } = await authenticate(supabase);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or expired token",
          code: "auth_invalid_token",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const planIdParam = params.id;
    if (!planIdParam) {
      return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid plan ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If planIdParam is a numeric string, treat it as an event ID and return
    // the current seating state reconstructed from assignments.
    const maybeEventId = parseInt(planIdParam, 10);
    if (isNaN(maybeEventId)) {
      // No stored historical plans table exists; respond with helpful message
      logWarning({
        request_id: requestId,
        endpoint: `/api/seating-plans/${planIdParam}`,
        method: "GET",
        error_type: "NotImplemented",
        error_message: "Non-numeric plan ID requested and historical plans are not stored",
        user_id: user.id,
      });

      return new Response(
        JSON.stringify({
          error: "Not Implemented",
          message:
            "Historical seating plan retrieval by plan_id is not implemented. Provide a numeric event ID to fetch the current plan, or use GET /api/events/{event_id}/assignments",
        }),
        { status: 501, headers: { "Content-Type": "application/json" } }
      );
    }

    const eventId = maybeEventId;

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, user_id, name, date")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (event.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "You do not have permission to access this seating plan",
          code: "forbidden",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch guests
    const { data: guests } = await supabase.from("guests").select("id, name").eq("event_id", eventId);

    // Fetch tables
    const { data: tables } = await supabase.from("tables").select("id, name, capacity").eq("event_id", eventId);

    // Fetch current assignments with guest and table info
    const { data: assignments } = await supabase
      .from("seating_assignments")
      .select("id, guest_id, table_id, guest:guests(id, name), table:tables(id, name)")
      .eq("event_id", eventId);

    // Build assignments array in response shape
    const formattedAssignments = (assignments || []).map((a: any) => ({
      guest_id: a.guest_id,
      guest_name: a.guest?.name ?? null,
      table_id: a.table_id,
      table_name: a.table?.name ?? null,
      compatibility_score: a.compatibility_score ?? 0,
      alternative_tables: [],
    }));

    const totalGuests = (guests || []).length;
    const assigned = formattedAssignments.length;
    const unassigned = totalGuests - assigned;
    const tablesUsed = new Set(formattedAssignments.map((f: any) => f.table_id)).size;
    const averageCompatibility =
      formattedAssignments.length > 0
        ? formattedAssignments.reduce((s: number, f: any) => s + (f.compatibility_score || 0), 0) /
          formattedAssignments.length
        : 0;

    const response = {
      plan_id: `current-event-${eventId}`,
      event_id: eventId,
      created_at: new Date().toISOString(),
      optimization_score: Math.round((averageCompatibility || 0) * 10) / 10,
      assignments: formattedAssignments,
      statistics: {
        total_guests: totalGuests,
        assigned,
        unassigned,
        tables_used: tablesUsed,
        average_table_compatibility: Math.round(averageCompatibility * 10) / 10,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    /* Full implementation would look like this:

    // 4. Fetch seating plan
    const { data: plan, error: planError } = await supabase
      .from('seating_plans')
      .select(`
        *,
        event:events!inner(id, user_id, name, date),
        assignments:plan_assignments(
          *,
          guest:guests(id, name),
          table:tables(id, name)
        )
      `)
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: 'Seating plan not found',
          code: 'plan_not_found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. Verify ownership
    if (plan.event.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access this seating plan',
          code: 'forbidden',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Format response
    const response = {
      plan_id: plan.id,
      event_id: plan.event_id,
      created_at: plan.created_at,
      optimization_score: plan.optimization_score,
      assignments: plan.assignments.map(a => ({
        guest_id: a.guest.id,
        guest_name: a.guest.name,
        table_id: a.table.id,
        table_name: a.table.name,
        compatibility_score: a.compatibility_score,
      })),
      statistics: {
        total_guests: plan.statistics.total_guests,
        assigned: plan.statistics.assigned,
        unassigned: plan.statistics.unassigned,
        tables_used: plan.statistics.tables_used,
        average_table_compatibility: plan.statistics.average_compatibility,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    */
  } catch (error) {
    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/seating-plans/${params.id}`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while retrieving seating plan",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
