globalThis.process ??= {}; globalThis.process.env ??= {};
import { l as logWarning, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../chunks/auth_COeveCsX.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const GET = async ({ locals, params }) => {
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
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const planIdParam = params.id;
    if (!planIdParam) {
      return new Response(JSON.stringify({ error: "Bad Request", message: "Invalid plan ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const maybeEventId = parseInt(planIdParam, 10);
    if (isNaN(maybeEventId)) {
      logWarning({
        request_id: requestId,
        endpoint: `/api/seating-plans/${planIdParam}`,
        method: "GET",
        error_type: "NotImplemented",
        error_message: "Non-numeric plan ID requested and historical plans are not stored",
        user_id: user.id
      });
      return new Response(
        JSON.stringify({
          error: "Not Implemented",
          message: "Historical seating plan retrieval by plan_id is not implemented. Provide a numeric event ID to fetch the current plan, or use GET /api/events/{event_id}/assignments"
        }),
        { status: 501, headers: { "Content-Type": "application/json" } }
      );
    }
    const eventId = maybeEventId;
    const { data: event, error: eventError } = await supabase.from("events").select("id, user_id, name, date").eq("id", eventId).single();
    if (eventError || !event) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found"
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (event.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "You do not have permission to access this seating plan",
          code: "forbidden"
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const { data: guests } = await supabase.from("guests").select("id, name").eq("event_id", eventId);
    const { data: tables } = await supabase.from("tables").select("id, name, capacity").eq("event_id", eventId);
    const { data: assignments } = await supabase.from("seating_assignments").select("id, guest_id, table_id, guest:guests(id, name), table:tables(id, name)").eq("event_id", eventId);
    const formattedAssignments = (assignments || []).map((a) => ({
      guest_id: a.guest_id,
      guest_name: a.guest?.name ?? null,
      table_id: a.table_id,
      table_name: a.table?.name ?? null,
      compatibility_score: a.compatibility_score ?? 0,
      alternative_tables: []
    }));
    const totalGuests = (guests || []).length;
    const assigned = formattedAssignments.length;
    const unassigned = totalGuests - assigned;
    const tablesUsed = new Set(formattedAssignments.map((f) => f.table_id)).size;
    const averageCompatibility = formattedAssignments.length > 0 ? formattedAssignments.reduce((s, f) => s + (f.compatibility_score || 0), 0) / formattedAssignments.length : 0;
    const response = {
      plan_id: `current-event-${eventId}`,
      event_id: eventId,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      optimization_score: Math.round((averageCompatibility || 0) * 10) / 10,
      assignments: formattedAssignments,
      statistics: {
        total_guests: totalGuests,
        assigned,
        unassigned,
        tables_used: tablesUsed,
        average_table_compatibility: Math.round(averageCompatibility * 10) / 10
      }
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/seating-plans/${params.id}`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while retrieving seating plan",
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
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
