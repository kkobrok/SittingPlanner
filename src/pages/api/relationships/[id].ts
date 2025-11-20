import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { UpdateRelationshipSchema } from "../../../validators/relationships.validator";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { authenticate } from "../../../middleware/auth";

/**
 * PATCH /api/relationships/{id}
 *
 * Updates an existing guest relationship.
 *
 * Path Parameters:
 * - id: Relationship ID (integer)
 *
 * Request Body (all optional):
 * - relationship_type: Type of relationship
 * - strength: Relationship strength (1-10)
 *
 * Responses:
 * - 200: Relationship updated successfully
 * - 400: Validation error or invalid relationship ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Relationship not found or user does not have access
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

    // 3. Parse and validate relationship ID
    const relationshipId = parseInt(params.id || "0", 10);
    if (!relationshipId || isNaN(relationshipId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid relationship ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateRelationshipSchema.parse(body);

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

    // 6. Fetch relationship to check authorization
    const { data: existingRelationship } = await supabase
      .from("guest_relationships")
      .select(
        `
        id,
        guests!guest_relationships_guest1_id_fkey!inner (
          event_id,
          events!inner (
            user_id
          )
        )
      `
      )
      .eq("id", relationshipId)
      .single();

    if (!existingRelationship) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const guestData = Array.isArray(existingRelationship.guests)
      ? existingRelationship.guests[0]
      : existingRelationship.guests;

    const eventData = Array.isArray(guestData.events) ? guestData.events[0] : guestData.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 7. Update relationship in database
    const { data: relationship, error: updateError } = await supabase
      .from("guest_relationships")
      .update(validatedData)
      .eq("id", relationshipId)
      .select()
      .single();

    if (updateError || !relationship) {
      throw new Error(`Failed to update relationship: ${updateError?.message}`);
    }

    // 8. Return success response
    return new Response(JSON.stringify(relationship), {
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
        endpoint: `/api/relationships/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Relationship update validation failed",
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
      endpoint: `/api/relationships/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating relationship",
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
 * DELETE /api/relationships/{id}
 *
 * Deletes a guest relationship.
 *
 * Path Parameters:
 * - id: Relationship ID (integer)
 *
 * Responses:
 * - 204: Relationship deleted successfully (no content)
 * - 400: Invalid relationship ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Relationship not found or user does not have access
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

    // 3. Parse and validate relationship ID
    const relationshipId = parseInt(params.id || "0", 10);
    if (!relationshipId || isNaN(relationshipId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid relationship ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch relationship to check authorization
    const { data: existingRelationship } = await supabase
      .from("guest_relationships")
      .select(
        `
        id,
        guests!guest_relationships_guest1_id_fkey!inner (
          event_id,
          events!inner (
            user_id
          )
        )
      `
      )
      .eq("id", relationshipId)
      .single();

    if (!existingRelationship) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const guestData = Array.isArray(existingRelationship.guests)
      ? existingRelationship.guests[0]
      : existingRelationship.guests;

    const eventData = Array.isArray(guestData.events) ? guestData.events[0] : guestData.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Relationship not found or you do not have permission to access it",
          code: "relationship_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Delete relationship from database
    const { error: deleteError } = await supabase.from("guest_relationships").delete().eq("id", relationshipId);

    if (deleteError) {
      throw new Error(`Failed to delete relationship: ${deleteError.message}`);
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
      endpoint: `/api/relationships/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting relationship",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
