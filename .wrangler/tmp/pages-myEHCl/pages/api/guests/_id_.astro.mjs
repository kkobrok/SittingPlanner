globalThis.process ??= {}; globalThis.process.env ??= {};
import { G as GuestsService, U as UpdateGuestSchema } from '../../../chunks/guests.service_z6RYdux2.mjs';
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
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const guestsService = new GuestsService(supabase);
    const guest = await guestsService.getGuestById(guestId, user.id);
    if (!guest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    return new Response(JSON.stringify(guest), {
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
      endpoint: `/api/guests/${params.id}`,
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
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const validatedData = UpdateGuestSchema.parse(body);
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
    const { data: existingGuest } = await supabase.from("guests").select(
      `
        id,
        events!inner (
          user_id
        )
      `
    ).eq("id", guestId).single();
    if (!existingGuest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingGuest.events) ? existingGuest.events[0] : existingGuest.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: guest, error: updateError } = await supabase.from("guests").update(validatedData).eq("id", guestId).select().single();
    if (updateError || !guest) {
      throw new Error(`Failed to update guest: ${updateError?.message}`);
    }
    return new Response(JSON.stringify(guest), {
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
        endpoint: `/api/guests/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Guest update validation failed",
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
      endpoint: `/api/guests/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating guest",
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
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: existingGuest } = await supabase.from("guests").select(
      `
        id,
        events!inner (
          user_id
        )
      `
    ).eq("id", guestId).single();
    if (!existingGuest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const eventData = Array.isArray(existingGuest.events) ? existingGuest.events[0] : existingGuest.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { error: deleteError } = await supabase.from("guests").delete().eq("id", guestId);
    if (deleteError) {
      throw new Error(`Failed to delete guest: ${deleteError.message}`);
    }
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/guests/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting guest",
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
