globalThis.process ??= {}; globalThis.process.env ??= {};
import { G as GenerateSeatingPlanRequestSchema, S as SeatingPlanService } from '../../../../../chunks/seating-plan.service_DZTLdP4U.mjs';
import { b as logInfo, l as logWarning, s as sanitizeContext, a as logError, e as extractErrorInfo } from '../../../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../../../chunks/auth_COeveCsX.mjs';
import { Z as ZodError } from '../../../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

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
    const validatedData = GenerateSeatingPlanRequestSchema.parse(body);
    const seatingPlanService = new SeatingPlanService(supabase);
    const result = await seatingPlanService.generateSeatingPlan(eventId, user.id, validatedData);
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
        optimization_score: result.optimization_score
      }
    });
    return new Response(JSON.stringify(result), {
      status: 201,
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
        endpoint: `/api/events/${params.id}/seating-plans/generate`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Seating plan request validation failed",
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
      if (error.message === "NO_GUESTS_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: no guests found for this event",
            code: "no_guests"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "NO_TABLES_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: no tables found for this event",
            code: "no_tables"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "INSUFFICIENT_TABLE_CAPACITY") {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Cannot generate seating plan: total table capacity is less than number of guests",
            code: "insufficient_capacity"
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message.includes("API key is not configured")) {
        logError({
          request_id: requestId,
          endpoint: `/api/events/${params.id}/seating-plans/generate`,
          method: "POST",
          error_type: "ConfigurationError",
          error_message: "OpenRouter API key not configured"
        });
        return new Response(
          JSON.stringify({
            error: "Service Unavailable",
            message: "AI seating optimization is not configured. Please contact support.",
            code: "ai_service_unavailable"
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/seating-plans/generate`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while generating seating plan",
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
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
