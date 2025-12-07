globalThis.process ??= {}; globalThis.process.env ??= {};
import { L as ListRelationshipsQuerySchema, C as CreateRelationshipSchema } from '../../../../chunks/relationships.validator_XyEDeWEE.mjs';
import { l as logWarning, s as sanitizeContext, e as extractErrorInfo, a as logError, b as logInfo } from '../../../../chunks/logger_Ca1ywfTT.mjs';
import { a as authenticate } from '../../../../chunks/auth_COeveCsX.mjs';
import { Z as ZodError } from '../../../../chunks/astro/server_D4BVXBCg.mjs';
export { r as renderers } from '../../../../chunks/_@astro-renderers_2pSJbG7R.mjs';

class RelationshipsService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Retrieves a paginated list of relationships for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of relationships with guest details
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listRelationshipsForEvent(eventId, userId, query) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    let dataQuery = this.supabase.from("guest_relationships").select("*, guests!guest_relationships_guest1_id_fkey(event_id)", { count: "exact" });
    dataQuery = dataQuery.eq("guests.event_id", eventId);
    if (query.guest_id) {
      dataQuery = dataQuery.or(`guest1_id.eq.${query.guest_id},guest2_id.eq.${query.guest_id}`);
    }
    if (query.relationship_type) {
      dataQuery = dataQuery.eq("relationship_type", query.relationship_type);
    }
    if (query.min_strength) {
      dataQuery = dataQuery.gte("strength", query.min_strength);
    }
    dataQuery = dataQuery.range(offset, offset + limit - 1);
    const { data: relationships, error: relationshipsError, count } = await dataQuery;
    if (relationshipsError) {
      throw new Error(`Failed to fetch relationships: ${relationshipsError.message}`);
    }
    const relationshipIds = relationships?.map((r) => r.id) || [];
    const relationshipsWithDetails = [];
    if (relationshipIds.length > 0) {
      const guestIds = /* @__PURE__ */ new Set();
      relationships?.forEach((r) => {
        guestIds.add(r.guest1_id);
        guestIds.add(r.guest2_id);
      });
      const { data: guests } = await this.supabase.from("guests").select("id, name").in("id", Array.from(guestIds));
      const guestMap = new Map(guests?.map((g) => [g.id, g.name]) || []);
      for (const rel of relationships || []) {
        relationshipsWithDetails.push({
          id: rel.id,
          guest1: {
            id: rel.guest1_id,
            name: guestMap.get(rel.guest1_id) || ""
          },
          guest2: {
            id: rel.guest2_id,
            name: guestMap.get(rel.guest2_id) || ""
          },
          relationship_type: rel.relationship_type,
          strength: rel.strength
        });
      }
    }
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    return {
      data: relationshipsWithDetails,
      pagination: {
        page,
        limit,
        total,
        total_pages
      }
    };
  }
  /**
   * Creates a new relationship between two guests
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param relationshipData - Relationship data to create
   * @returns Created relationship
   * @throws Error if database query fails or guests don't belong to event
   */
  async createRelationship(eventId, userId, relationshipData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const { data: guests } = await this.supabase.from("guests").select("id").eq("event_id", eventId).in("id", [relationshipData.guest1_id, relationshipData.guest2_id]);
    if (!guests || guests.length !== 2) {
      throw new Error("GUESTS_NOT_FOUND");
    }
    const { data: relationship, error: createError } = await this.supabase.from("guest_relationships").insert(relationshipData).select().single();
    if (createError) {
      throw new Error(`Failed to create relationship: ${createError.message}`);
    }
    return relationship;
  }
}

const GET = async ({ locals, request, params }) => {
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
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      guest_id: url.searchParams.get("guest_id"),
      relationship_type: url.searchParams.get("relationship_type"),
      min_strength: url.searchParams.get("min_strength")
    };
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== null));
    const validatedQuery = ListRelationshipsQuerySchema.parse(filteredParams);
    const relationshipsService = new RelationshipsService(supabase);
    const result = await relationshipsService.listRelationshipsForEvent(eventId, user.id, validatedQuery);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    const requestId = crypto.randomUUID();
    if (error instanceof ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code
      }));
      logWarning({
        request_id: requestId,
        endpoint: `/api/events/${params.id}/relationships`,
        method: "GET",
        error_type: "ValidationError",
        error_message: "Request validation failed",
        context: sanitizeContext({
          validation_errors: details,
          url: request.url
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
    if (error instanceof Error && error.message === "EVENT_NOT_FOUND") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Event not found or you do not have permission to access it",
          code: "event_not_found"
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/relationships`,
      method: "GET",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack,
      context: sanitizeContext({
        url: request.url
      })
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
const POST = async ({ locals, request, params }) => {
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
    const eventId = parseInt(params.id || "0", 10);
    if (!eventId || isNaN(eventId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid event ID"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const body = await request.json();
    const validatedData = CreateRelationshipSchema.parse(body);
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
        relationship_id: relationship.id
      }
    });
    return new Response(JSON.stringify(relationship), {
      status: 201,
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
        endpoint: `/api/events/${params.id}/relationships`,
        method: "POST",
        error_type: "ValidationError",
        error_message: "Relationship creation validation failed",
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
    if (error instanceof Error) {
      if (error.message === "EVENT_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "Event not found or you do not have permission to access it",
            code: "event_not_found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      if (error.message === "GUESTS_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "Not Found",
            message: "One or both guests not found in this event",
            code: "guests_not_found"
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    const errorInfo = extractErrorInfo(error);
    logError({
      request_id: requestId,
      endpoint: `/api/events/${params.id}/relationships`,
      method: "POST",
      error_type: errorInfo.type,
      error_message: errorInfo.message,
      stack_trace: errorInfo.stack
    });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while creating relationship",
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
  GET,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
