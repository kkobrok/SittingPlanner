import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { UpdateGuestSchema } from "../../../validators/guests.validator";
import { GuestsService } from "../../../services/guests.service";
import { logError, logWarning, extractErrorInfo, sanitizeContext } from "../../../utils/logger";
import { authenticate } from "../../../middleware/auth";

/**
 * GET /api/guests/{id}
 *
 * Retrieves a single guest by ID with full details including relationships and table assignment.
 *
 * Path Parameters:
 * - id: Guest ID (integer)
 *
 * Responses:
 * - 200: Success with guest details
 * - 400: Invalid guest ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Guest not found or user does not have access
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

    // 3. Parse and validate guest ID
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Call service layer to fetch guest
    const guestsService = new GuestsService(supabase);
    const guest = await guestsService.getGuestById(guestId, user.id);

    if (!guest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Return successful response
    return new Response(JSON.stringify(guest), {
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
      endpoint: `/api/guests/${params.id}`,
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
 * PATCH /api/guests/{id}
 *
 * Updates an existing guest.
 *
 * Path Parameters:
 * - id: Guest ID (integer)
 *
 * Request Body (all optional):
 * - name: Guest name (max 255 characters)
 * - age: Guest age (1-120)
 * - hobbies: Guest hobbies/interests (max 1000 characters)
 * - dietary_restrictions: Dietary restrictions (max 500 characters)
 * - topics_to_avoid: Topics to avoid (max 500 characters)
 * - drinks_alcohol: Whether guest drinks alcohol (boolean)
 *
 * Responses:
 * - 200: Guest updated successfully
 * - 400: Validation error or invalid guest ID
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Guest not found or user does not have access
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

    // 3. Parse and validate guest ID
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateGuestSchema.parse(body);

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

    // 6. Fetch guest to check authorization
    const { data: existingGuest } = await supabase
      .from("guests")
      .select(
        `
        id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", guestId)
      .single();

    if (!existingGuest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingGuest.events) ? existingGuest.events[0] : existingGuest.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 7. Update guest in database
    const { data: guest, error: updateError } = await supabase
      .from("guests")
      .update(validatedData)
      .eq("id", guestId)
      .select()
      .single();

    if (updateError || !guest) {
      throw new Error(`Failed to update guest: ${updateError?.message}`);
    }

    // 8. Return success response
    return new Response(JSON.stringify(guest), {
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
        endpoint: `/api/guests/${params.id}`,
        method: "PATCH",
        error_type: "ValidationError",
        error_message: "Guest update validation failed",
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
      endpoint: `/api/guests/${params.id}`,
      method: "PATCH",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating guest",
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
 * DELETE /api/guests/{id}
 *
 * Deletes a guest and all associated data (relationships, seating assignments).
 *
 * Path Parameters:
 * - id: Guest ID (integer)
 *
 * Responses:
 * - 204: Guest deleted successfully (no content)
 * - 400: Invalid guest ID format
 * - 401: Unauthorized (missing or invalid token)
 * - 404: Guest not found or user does not have access
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

    // 3. Parse and validate guest ID
    const guestId = parseInt(params.id || "0", 10);
    if (!guestId || isNaN(guestId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid guest ID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Fetch guest to check authorization
    const { data: existingGuest } = await supabase
      .from("guests")
      .select(
        `
        id,
        events!inner (
          user_id
        )
      `
      )
      .eq("id", guestId)
      .single();

    if (!existingGuest) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check event ownership
    const eventData = Array.isArray(existingGuest.events) ? existingGuest.events[0] : existingGuest.events;

    if (!eventData || eventData.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Guest not found or you do not have permission to access it",
          code: "guest_not_found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Delete guest from database (cascade will handle relationships and assignments)
    const { error: deleteError } = await supabase.from("guests").delete().eq("id", guestId);

    if (deleteError) {
      throw new Error(`Failed to delete guest: ${deleteError.message}`);
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
      endpoint: `/api/guests/${params.id}`,
      method: "DELETE",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting guest",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
