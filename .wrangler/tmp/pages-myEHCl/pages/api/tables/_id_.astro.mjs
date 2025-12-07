globalThis.process ??= {}; globalThis.process.env ??= {};
import { T as TablesService, U as UpdateTableSchema } from '../../../chunks/tables.service_LK3KziMe.mjs';
import { e as extractErrorInfo, a as logError, l as logWarning, s as sanitizeContext } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../chunks/auth_CNDQV6fn.mjs';
import { Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

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
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const tablesService = new TablesService(supabase);
    const table = await tablesService.getTableById(tableId, user.id);
    if (!table) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return new Response(JSON.stringify(table), {
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
      endpoint: `/api/tables/${params.id}`,
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
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const validatedData = UpdateTableSchema.parse(body);
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
    const { data: existingTable } = await supabase.from("tables").select(
      `
        id,
        events!inner (
          user_id
        )
      `
    ).eq("id", tableId).single();
    if (!existingTable) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingTable.events) ? existingTable.events[0] : existingTable.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: table, error: updateError } = await supabase.from("tables").update(validatedData).eq("id", tableId).select().single();
    if (updateError || !table) {
      throw new Error(`Failed to update table: ${updateError?.message}`);
    }
    return new Response(JSON.stringify(table), {
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
        endpoint: `/api/tables/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Table update validation failed",
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
      endpoint: `/api/tables/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating table",
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
    const tableId = parseInt(params.id || "0", 10);
    if (!tableId || isNaN(tableId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid table ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: existingTable } = await supabase.from("tables").select(
      `
        id,
        events!inner (
          user_id
        )
      `
    ).eq("id", tableId).single();
    if (!existingTable) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingTable.events) ? existingTable.events[0] : existingTable.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Table not found or you do not have permission to access it",
          code: "table_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { error: deleteError } = await supabase.from("tables").delete().eq("id", tableId);
    if (deleteError) {
      throw new Error(`Failed to delete table: ${deleteError.message}`);
    }
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/tables/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting table",
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
