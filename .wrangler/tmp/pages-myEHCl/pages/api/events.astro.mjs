globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, s as stringType, e as enumType, b as coerce, Z as ZodError } from '../../chunks/astro/server_D4BVXBCg.mjs';
import { E as EventsService } from '../../chunks/events.service_DdWZU19i.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError, b as logInfo } from '../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../chunks/auth_CNDQV6fn.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_2pSJbG7R.mjs';

const ListEventsQuerySchema = objectType({
  page: coerce.number().int({ message: "Page must be an integer" }).positive({ message: "Page must be a positive number" }).optional().default(1),
  limit: coerce.number().int({ message: "Limit must be an integer" }).min(1, { message: "Limit must be at least 1" }).max(100, { message: "Limit must not exceed 100" }).optional().default(20),
  sort: enumType(["created_at", "updated_at", "date", "name"], {
    errorMap: () => ({
      message: "Sort field must be one of: created_at, updated_at, date, name"
    })
  }).optional().default("created_at"),
  order: enumType(["asc", "desc"], {
    errorMap: () => ({
      message: "Order must be either asc or desc"
    })
  }).optional().default("desc"),
  search: stringType().max(255, { message: "Search term must not exceed 255 characters" }).optional()
});

const CreateEventSchema = objectType({
  name: stringType({ required_error: "Name is required" }).min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim(),
  date: stringType({ required_error: "Date is required" }).regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in ISO 8601 format (YYYY-MM-DD)" })
});
const GET = async ({ locals, request }) => {
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
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sort: url.searchParams.get("sort"),
      order: url.searchParams.get("order"),
      search: url.searchParams.get("search")
    };
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));
    const validatedQuery = ListEventsQuerySchema.parse(filteredParams);
    const eventsService = new EventsService(supabase);
    const result = await eventsService.listEventsForUser(user.id, validatedQuery);
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
        endpoint: "/api/events",
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
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: "/api/events",
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
const POST = async ({ locals, request }) => {
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
    const body = await request.json();
    const validatedData = CreateEventSchema.parse(body);
    const { data: event, error: createError } = await supabase.from("events").insert({
      user_id: user.id,
      name: validatedData.name,
      date: validatedData.date
    }).select().single();
    if (createError) {
      throw new Error(`Failed to create event: ${createError.message}`);
    }
    logInfo({
      request_id: requestId,
      endpoint: "/api/events",
      method: "POST",
      error_type: "Success",
      error_message: "Event created successfully",
      user_id: user.id,
      context: {
        event_id: event.id,
        event_name: validatedData.name
      }
    });
    return new Response(JSON.stringify(event), {
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
        endpoint: "/api/events",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Event creation validation failed",
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
      endpoint: "/api/events",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating event",
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
