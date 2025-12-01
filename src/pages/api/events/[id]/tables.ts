/* eslint-disable @typescript-eslint/no-unused-vars */
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import {
  ListTablesQuerySchema,
  CreateTableSchema,
  BulkCreateTablesSchema,
} from "../../../../validators/tables.validator";
import { TablesService } from "../../../../services/tables.service";
import { logError, logWarning, logInfo, extractErrorInfo, sanitizeContext } from "../../../../utils/logger";
import { authenticate } from "../../../../middleware/auth";

/**
 * GET /api/events/{id}/tables
 *
 * Retrieves all tables for a specific event with occupancy information.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Query Parameters:
 * - sort (optional): Sort field - "name" or "capacity" (default: "name")
 * - order (optional): Sort order "asc" or "desc" (default: "asc")
 *
 * Responses:
 * - 200: Success with tables list
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
      sort: url.searchParams.get("sort"),
      order: url.searchParams.get("order"),
    };

    // Filter out null values to allow defaults to work
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));

    // Validate using Zod schema
    const validatedQuery = ListTablesQuerySchema.parse(filteredParams);

    // 5. Call service layer to fetch tables
    const tablesService = new TablesService(supabase);
    const result = await tablesService.listTablesForEvent(eventId, user.id, validatedQuery);

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
        endpoint: `/api/events/${params.id}/tables`,
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
      endpoint: `/api/events/${params.id}/tables`,
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
 * POST /api/events/{id}/tables
 *
 * Creates a new table for an event or creates multiple tables in bulk.
 *
 * Path Parameters:
 * - id: Event ID (integer)
 *
 * Request Body (Single Table):
 * - name (required): Table name (max 255 characters)
 * - capacity (required): Table capacity (1-100)
 *
 * Request Body (Bulk Create):
 * - tables (required): Array of table objects (max 50 at once)
 *
 * Responses:
 * - 201: Table(s) created successfully
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
    const isBulk = "tables" in body && Array.isArray(body.tables);

    const tablesService = new TablesService(supabase);

    if (isBulk) {
      // Bulk create
      const validatedData = BulkCreateTablesSchema.parse(body);
      const result = await tablesService.bulkCreateTables(eventId, user.id, validatedData);

      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/tables`,
        method: "POST",
        error_type: "Success",
        error_message: "Bulk tables created successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          tables_created: result.created,
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
      const validatedData = CreateTableSchema.parse(body);
      const table = await tablesService.createTable(eventId, user.id, validatedData);

      logInfo({
        request_id: requestId,
        endpoint: `/api/events/${eventId}/tables`,
        method: "POST",
        error_type: "Success",
        error_message: "Table created successfully",
        user_id: user.id,
        context: {
          event_id: eventId,
          table_id: table.id,
          table_name: validatedData.name,
        },
      });

      return new Response(JSON.stringify(table), {
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
        endpoint: `/api/events/${params.id}/tables`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Table creation validation failed",
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
      endpoint: `/api/events/${params.id}/tables`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating table(s)",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
