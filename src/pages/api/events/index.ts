/* eslint-disable @typescript-eslint/no-unused-vars */
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { ListEventsQuerySchema } from "../../../validators/events.validator";
import { EventsService } from "../../../services/events.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { z } from "zod";
import { authenticate } from "../../../middleware/auth";

/**
 * Validation schema for creating an event
 */
const CreateEventSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim(),

  date: z
    .string({ required_error: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in ISO 8601 format (YYYY-MM-DD)" }),
});

/**
 * GET /api/events
 *
 * Retrieves a paginated list of events for the authenticated user.
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - sort (optional): Sort field (default: "created_at")
 * - order (optional): Sort order "asc" or "desc" (default: "desc")
 * - search (optional): Search term for event name
 *
 * Responses:
 * - 200: Success with paginated events
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, request }) => {
  try {
    // 1. Get Supabase client from context (added by middleware)
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

    // 3. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams: Record<string, string | null> = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      sort: url.searchParams.get("sort"),
      order: url.searchParams.get("order"),
      search: url.searchParams.get("search"),
    };

    // Filter out null values to allow defaults to work
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));

    // Validate using Zod schema
    const validatedQuery = ListEventsQuerySchema.parse(filteredParams);

    // 4. Call service layer to fetch events
    const eventsService = new EventsService(supabase);
    const result = await eventsService.listEventsForUser(user.id, validatedQuery);

    // 5. Return successful response
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

      // Log validation error at warning level
      logWarning({
        request_id: requestId,
        endpoint: "/api/events",
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

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    // Log error with full context
    logError({
      request_id: requestId,
      endpoint: "/api/events",
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
 * POST /api/events
 *
 * Creates a new event for the authenticated user.
 *
 * Request Body:
 * - name (required): Event name (max 255 characters)
 * - date (required): Event date in ISO 8601 format (YYYY-MM-DD)
 *
 * Responses:
 * - 201: Event created successfully
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid token)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ locals, request }) => {
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

    // 3. Parse and validate request body
    const body = await request.json();
    const validatedData = CreateEventSchema.parse(body);

    // 4. Create event in database
    const { data: event, error: createError } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        date: validatedData.date,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create event: ${createError.message}`);
    }

    // 5. Log successful creation
    logInfo({
      request_id: requestId,
      endpoint: "/api/events",
      method: "POST",
      error_type: "Success",
      error_message: "Event created successfully",
      user_id: user.id,
      context: {
        event_id: event.id,
        event_name: validatedData.name,
      },
    });

    // 6. Return success response
    return new Response(JSON.stringify(event), {
      status: 201,
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
        endpoint: "/api/events",
        method: "POST",
        error_type: "ValidationError",
        error_message: "Event creation validation failed",
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
      endpoint: "/api/events",
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating event",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
