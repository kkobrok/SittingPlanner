globalThis.process ??= {}; globalThis.process.env ??= {};
import { L as ListGuestsQuerySchema, G as GuestsService, B as BulkCreateGuestsSchema, C as CreateGuestSchema } from '../../../../chunks/guests.service_z6RYdux2.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError, b as logInfo } from '../../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../../chunks/auth_COeveCsX.mjs';
import { Z as ZodError } from '../../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

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
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sort: url.searchParams.get("sort"),
      order: url.searchParams.get("order"),
      search: url.searchParams.get("search")
    };
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));
    const validatedQuery = ListGuestsQuerySchema.parse(filteredParams);
    const guestsService = new GuestsService(supabase);
    const result = await guestsService.listGuestsForEvent(eventId, user.id, validatedQuery);
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
        endpoint: `/api/events/${params.id}/guests`,
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
      endpoint: `/api/events/${params.id}/guests`,
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
    const isBulk = "guests" in body && Array.isArray(body.guests);
    const guestsService = new GuestsService(supabase);
    if (isBulk) {
      const validatedData = BulkCreateGuestsSchema.parse(body);
      const result = await guestsService.bulkCreateGuests(eventId, user.id, validatedData);
      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/guests`,
        method: "POST",
        error_type: "Success",
        error_message: "Bulk guests created successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          guests_created: result.created
        }
      });
      return new Response(JSON.stringify(result), {
        status: 201,
        headers: {
          "Content-Type": "application/json"
        }
      });
    } else {
      const validatedData = CreateGuestSchema.parse(body);
      const guest = await guestsService.createGuest(eventId, user.id, validatedData);
      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/guests`,
        method: "POST",
        error_type: "Success",
        error_message: "Guest created successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          guest_id: guest.id,
          guest_name: validatedData.name
        }
      });
      return new Response(JSON.stringify(guest), {
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
        endpoint: `/api/events/${params.id}/guests`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Guest creation validation failed",
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
      endpoint: `/api/events/${params.id}/guests`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating guest(s)",
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
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
