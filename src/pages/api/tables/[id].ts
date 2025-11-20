import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { UpdateTableSchema } from "../../../validators/tables.validator";
import { TablesService } from "../../../services/tables.service";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { authenticate } from "../../../middleware/auth";

/**
 * GET /api/tables/{id}
 *
 * Retrieves a single table by ID with occupancy information.
 *
 * Path Parameters:
 * - id: Table ID (integer)
 *
 * Responses:
 * - 200: Success with table details
 * - 400: Invalid table ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Table not found or user does not have access
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ locals, params }) => {
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

    // 3. Parse and validate table ID
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Call service layer to fetch table
    const tablesService = new TablesService(supabase);
    const table = await tablesService.getTableById(tableId, user.id);

    if (!table) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Return successful response
    return new Response(JSON.stringify(table), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const requestId = crypto.randomUUID();

    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    // Log error with full context
    logError({
      request_id: requestId,
      endpoint: `/api/tables/${params.id}`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
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
 * PATCH /api/tables/{id}
 *
 * Updates an existing table.
 *
 * Path Parameters:
 * - id: Table ID (integer)
 *
 * Request Body (all optional):
 * - name: Table name (max 255 characters)
 * - capacity: Table capacity (1-100)
 *
 * Responses:
 * - 200: Table updated successfully
 * - 400: Validation error or invalid table ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Table not found or user does not have access
 * - 500: Internal server error
 */
export const PATCH: APIRoute = async ({ locals, request, params }) => {
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

    // 3. Parse and validate table ID
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateTableSchema.parse(body);

    // 5. Check if there are any fields to update
    if (Object.keys(validatedData).length === 0) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "No fields provided to update",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Fetch table to check authorization
    const { data: existingTable } = await supabase
      .from("tables")
      .select(
        `
        id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", tableId)
      .single();

    if (!existingTable) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingTable.events) ? existingTable.events[0] : existingTable.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 7. Update table in database
    const { data: table, error: updateError } = await supabase
      .from("tables")
      .update(validatedData)
      .eq("id", tableId)
      .select()
      .single();

    if (updateError || !table) {
      throw new Error(`Failed to update table: ${updateError?.message}`);
    }

    // 8. Return success response
    return new Response(JSON.stringify(table), {
      status: 200,
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
        endpoint: `/api/tables/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Table update validation failed",
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
      endpoint: `/api/tables/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating table",
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
 * DELETE /api/tables/{id}
 *
 * Deletes a table and all associated seating assignments.
 *
 * Path Parameters:
 * - id: Table ID (integer)
 *
 * Responses:
 * - 204: Table deleted successfully (no content)
 * - 400: Invalid table ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Table not found or user does not have access
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
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

    // 3. Parse and validate table ID
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch table to check authorization
    const { data: existingTable } = await supabase
      .from("tables")
      .select(
        `
        id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", tableId)
      .single();

    if (!existingTable) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingTable.events) ? existingTable.events[0] : existingTable.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Delete table from database (cascade will handle assignments)
    const { error: deleteError } = await supabase.from("tables").delete().eq("id", tableId);

    if (deleteError) {
      throw new Error(`Failed to delete table: ${deleteError.message}`);
    }

    // 6. Return success response with no content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle unexpected errors
    const errorInfo = extractErrorInfo(error);

    logError({
      request_id: requestId,
      endpoint: `/api/tables/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting table",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
