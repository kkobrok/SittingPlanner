import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { ListRelationshipsQuerySchema, CreateRelationshipSchema } from "../../../../validators/relationships.validator";
import { RelationshipsService } from "../../../../services/relationships.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../../utils/logger";
import { authenticate } from "../../../../middleware/auth";

/**
 * GET /api/events/{id}/relationships
 *
 * Retrieves a paginated list of guest relationships for a specific event.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Query Parameters:
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 20, max: 100)
 * - guest_id (optional): Filter by specific guest ID
 * - relationship_type (optional): Filter by relationship type
 * - min_strength (optional): Minimum relationship strength (1-10)
 *
 * Responses:
 * - 200: Success with paginated relationships
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
      guest_id: url.searchParams.get("guest_id"),
      relationship_type: url.searchParams.get("relationship_type"),
      min_strength: url.searchParams.get("min_strength"),
    };

    // Filter out null values to allow defaults to work
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));

    // Validate using Zod schema
    const validatedQuery = ListRelationshipsQuerySchema.parse(filteredParams);

    // 5. Call service layer to fetch relationships
    const relationshipsService = new RelationshipsService(supabase);
    const result = await relationshipsService.listRelationshipsForEvent(eventId, user.id, validatedQuery);

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
        endpoint: `/api/events/${params.id}/relationships`,
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
      endpoint: `/api/events/${params.id}/relationships`,
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
 * POST /api/events/{id}/relationships
 *
 * Creates a new relationship between two guests in an event.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Request Body:
 * - guest1_id (required): First guest ID
 * - guest2_id (required): Second guest ID
 * - relationship_type (required): Type of relationship (e.g., "friend", "family")
 * - strength (optional): Relationship strength (1-10)
 *
 * Responses:
 * - 201: Relationship created successfully
 * - 400: Validation error or invalid event ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Event or guests not found
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
    const validatedData = CreateRelationshipSchema.parse(body);

    // 5. Create relationship
    const relationshipsService = new RelationshipsService(supabase);
    const relationship = await relationshipsService.createRelationship(eventId, user.id, validatedData);

    logInfo({
      request_id: requestId,
      endpoint: `/api/events/${eventId}/relationships`,
      method: "POST",
      error_type: "Success",
      error_message: "Relationship created successfully",
      user_id: user.id,
      context: {
        event_id: eventId,
        relationship_id: relationship.id,
      },
    });

    // 6. Return success response
    return new Response(JSON.stringify(relationship), {
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
        endpoint: `/api/events/${params.id}/relationships`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Relationship creation validation failed",
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
    if (error instanceof Error) {
      if (error.message === "EVENT_NOT_FOUND") {
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

      if (error.message === "GUESTS_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "One or both guests not found in this event",
            code: "guests_not_found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/relationships`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating relationship",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
