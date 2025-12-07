globalThis.process ??= {}; globalThis.process.env ??= {};
import { E as EventsService } from '../../../chunks/events.service_DdWZU19i.mjs';
import { e as extractErrorInfo, a as logError, l as logWarning, s as sanitizeContext } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../chunks/auth_CNDQV6fn.mjs';
import { o as objectType, s as stringType, Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const UpdateEventSchema = objectType({
  name: stringType().min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim().optional(),
  date: stringType().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in ISO 8601 format (YYYY-MM-DD)" }).optional()
});
const GET = async ({ locals, params }) => {
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
    const eventsService = new EventsService(supabase);
    const event = await eventsService.getEventById(eventId, user.id);
    if (!event) {
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
    return new Response(JSON.stringify(event), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
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
    const validatedData = UpdateEventSchema.parse(body);
    if (Object.keys(validatedData).length === 0) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "No fields provided to update"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: event, error: updateError } = await supabase.from("events").update(validatedData).eq("id", eventId).eq("user_id", user.id).select().single();
    if (updateError || !event) {
      const { data: existingEvent } = await supabase.from("events").select("id").eq("id", eventId).single();
      if (!existingEvent) {
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
      throw new Error(`Failed to update event: ${updateError?.message}`);
    }
    return new Response(JSON.stringify(event), {
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
        endpoint: `/api/events/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Event update validation failed",
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
      endpoint: `/api/events/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating event",
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
    const { error: deleteError, count } = await supabase.from("events").delete().eq("id", eventId).eq("user_id", user.id);
    if (deleteError) {
      throw new Error(`Failed to delete event: ${deleteError.message}`);
    }
    if (count === 0) {
      const { data: existingEvent } = await supabase.from("events").select("id").eq("id", eventId).single();
      if (!existingEvent) {
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
    }
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting event",
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
  PATCH
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
