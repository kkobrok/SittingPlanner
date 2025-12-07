globalThis.process ??= {}; globalThis.process.env ??= {};
import { U as UpdateRelationshipSchema } from '../../../chunks/relationships.validator_XyEDeWEE.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError } from '../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../chunks/auth_CNDQV6fn.mjs';
import { Z as ZodError } from '../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

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
    const relationshipId = parseInt(params.id || "0", 10);
    if (!relationshipId || isNaN(relationshipId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid relationship ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const validatedData = UpdateRelationshipSchema.parse(body);
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
    const { data: existingRelationship } = await supabase.from("guest_relationships").select(
      `
        id,
        guests!guest_relationships_guest1_id_fkey!inner (
          event_id,
          events!inner (
            user_id
          )
        )
      `
    ).eq("id", relationshipId).single();
    if (!existingRelationship) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const guestData = Array.isArray(existingRelationship.guests) ? existingRelationship.guests[0] : existingRelationship.guests;
    const eventData = Array.isArray(guestData.events) ? guestData.events[0] : guestData.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: relationship, error: updateError } = await supabase.from("guest_relationships").update(validatedData).eq("id", relationshipId).select().single();
    if (updateError || !relationship) {
      throw new Error(`Failed to update relationship: ${updateError?.message}`);
    }
    return new Response(JSON.stringify(relationship), {
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
        endpoint: `/api/relationships/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Relationship update validation failed",
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
      endpoint: `/api/relationships/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating relationship",
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
    const relationshipId = parseInt(params.id || "0", 10);
    if (!relationshipId || isNaN(relationshipId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid relationship ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { data: existingRelationship } = await supabase.from("guest_relationships").select(
      `
        id,
        guests!guest_relationships_guest1_id_fkey!inner (
          event_id,
          events!inner (
            user_id
          )
        )
      `
    ).eq("id", relationshipId).single();
    if (!existingRelationship) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const guestData = Array.isArray(existingRelationship.guests) ? existingRelationship.guests[0] : existingRelationship.guests;
    const eventData = Array.isArray(guestData.events) ? guestData.events[0] : guestData.events;
    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const { error: deleteError } = await supabase.from("guest_relationships").delete().eq("id", relationshipId);
    if (deleteError) {
      throw new Error(`Failed to delete relationship: ${deleteError.message}`);
    }
    return new Response(null, {
      status: 204
    });
  } catch (error) {
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/relationships/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting relationship",
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
  PATCH
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
