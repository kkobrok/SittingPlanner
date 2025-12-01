/* eslint-disable @typescript-eslint/no-unused-vars */
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  ListGuestsQuerySchema,
  CreateGuestSchema,
  BulkCreateGuestsSchema,
} from "../../../../validators/guests.validator";
import { GuestsService } from "../../../../services/guests.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../../utils/logger";
import { authenticate } from "../../../../middleware/auth";

/**
 * GET /api/events/{id}/guests
 *
 * Retrieves a paginated list of guests for a specific event.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - sort (optional): Sort field (default: "created_at")
 * - order (optional): Sort order "asc" or "desc" (default: "desc")
 * - search (optional): Search term for guest name
 *
 * Responses:
 * - 200: Success with paginated guests
 * - 400: Validation error or invalid event ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, request, params }) => {
  try {
    // 1. Get Supabase client from context
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

    // 3. Parse and validate event ID
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate query parameters
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
    const validatedQuery = ListGuestsQuerySchema.parse(filteredParams);

    // 5. Call service layer to fetch guests
    const guestsService = new GuestsService(supabase);
    const result = await guestsService.listGuestsForEvent(eventId, user.id, validatedQuery);

    // 6. Return successful response
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

      logWarning({
        request_id: requestId,
        endpoint: `/api/events/${params.id}/guests`,
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

    // Handle specific business logic errors
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/guests`,
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
 * POST /api/events/{id}/guests
 *
 * Creates a new guest for an event or creates multiple guests in bulk.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Request Body (Single Guest):
 * - name (required): Guest name (max 255 characters)
 * - age (optional): Guest age (1-120)
 * - hobbies (optional): Guest hobbies/interests (max 1000 characters)
 * - dietary_restrictions (optional): Dietary restrictions (max 500 characters)
 * - topics_to_avoid (optional): Topics to avoid (max 500 characters)
 * - drinks_alcohol (optional): Whether guest drinks alcohol (boolean)
 *
 * Request Body (Bulk Create):
 * - guests (required): Array of guest objects (max 100 at once)
 *
 * Responses:
 * - 201: Guest(s) created successfully
 * - 400: Validation error or invalid event ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event not found or user does not have access
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ locals, request, params }) => {
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

    // 3. Parse and validate event ID
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();

    // Determine if this is a bulk create or single create
    const isBulk = "guests" in body && Array.isArray(body.guests);

    const guestsService = new GuestsService(supabase);

    if (isBulk) {
      // Bulk create
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
          guests_created: result.created,
        },
      });

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      // Single create
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
          guest_name: validatedData.name,
        },
      });

      return new Response(JSON.stringify(guest), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
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
        endpoint: `/api/events/${params.id}/guests`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Guest creation validation failed",
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

    // Handle specific business logic errors
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/guests`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating guest(s)",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
