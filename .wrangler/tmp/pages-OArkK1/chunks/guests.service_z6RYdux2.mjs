globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, s as stringType, e as enumType, b as coerce, d as arrayType } from './astro/server_D4BVXBCg.mjs';

const ListGuestsQuerySchema = objectType({
  page: coerce.number({ invalid_type_error: "Page must be a number" }).int({ message: "Page must be an integer" }).positive({ message: "Page must be positive" }).optional().default(1),
  limit: coerce.number({ invalid_type_error: "Limit must be a number" }).int({ message: "Limit must be an integer" }).min(1, { message: "Limit must be at least 1" }).max(100, { message: "Limit cannot exceed 100" }).optional().default(20),
  sort: enumType(["name"], {
    errorMap: () => ({ message: "Invalid sort field" })
  }).optional().default("name"),
  order: enumType(["asc", "desc"], {
    errorMap: () => ({ message: "Order must be asc or desc" })
  }).optional().default("desc"),
  search: stringType().max(255, { message: "Search term must not exceed 255 characters" }).optional()
});
const CreateGuestSchema = objectType({
  name: stringType({ required_error: "Name is required" }).min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim(),
  age_range: stringType().max(50, { message: "Age range must not exceed 50 characters" }).optional().nullable(),
  hobbies_interests: stringType().max(1e3, { message: "Hobbies/interests must not exceed 1000 characters" }).optional().nullable(),
  dietary_restrictions: stringType().max(500, { message: "Dietary restrictions must not exceed 500 characters" }).optional().nullable(),
  topics_to_avoid: stringType().max(500, { message: "Topics to avoid must not exceed 500 characters" }).optional().nullable(),
  drinking_habits: stringType().max(50, { message: "Drinking habits must not exceed 50 characters" }).optional().nullable()
});
const BulkCreateGuestsSchema = objectType({
  guests: arrayType(CreateGuestSchema, { required_error: "Guests array is required" }).min(1, { message: "At least one guest must be provided" }).max(100, { message: "Cannot create more than 100 guests at once" })
});
const UpdateGuestSchema = objectType({
  name: stringType().min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim().optional(),
  age_range: stringType().max(50, { message: "Age range must not exceed 50 characters" }).optional().nullable(),
  hobbies_interests: stringType().max(1e3, { message: "Hobbies/interests must not exceed 1000 characters" }).optional().nullable(),
  dietary_restrictions: stringType().max(500, { message: "Dietary restrictions must not exceed 500 characters" }).optional().nullable(),
  topics_to_avoid: stringType().max(500, { message: "Topics to avoid must not exceed 500 characters" }).optional().nullable(),
  drinking_habits: stringType().max(50, { message: "Drinking habits must not exceed 50 characters" }).optional().nullable()
});

class GuestsService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Retrieves a paginated list of guests for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of guests with table assignments
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listGuestsForEvent(eventId, userId, query) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";
    const search = query.search;
    const offset = (page - 1) * limit;
    let dataQuery = this.supabase.from("guests").select("*", { count: "exact" }).eq("event_id", eventId);
    if (search) {
      dataQuery = dataQuery.ilike("name", `%${search}%`);
    }
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });
    dataQuery = dataQuery.range(offset, offset + limit - 1);
    const { data: guests, error: guestsError, count } = await dataQuery;
    if (guestsError) {
      throw new Error(`Failed to fetch guests: ${guestsError.message}`);
    }
    const guestIds = guests?.map((g) => g.id) || [];
    const guestsWithAssignments = [];
    if (guestIds.length > 0) {
      const { data: assignments } = await this.supabase.from("seating_assignments").select(
        `
          guest_id,
          table_id,
          tables (
            id,
            name
          )
        `
      ).in("guest_id", guestIds);
      const assignmentMap = /* @__PURE__ */ new Map();
      assignments?.forEach((a) => {
        if (a.tables && !Array.isArray(a.tables)) {
          assignmentMap.set(a.guest_id, {
            table_id: a.table_id,
            table_name: a.tables.name
          });
        }
      });
      for (const guest of guests || []) {
        guestsWithAssignments.push({
          ...guest,
          table_assignment: assignmentMap.get(guest.id) || null
        });
      }
    }
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    return {
      data: guestsWithAssignments,
      pagination: {
        page,
        limit,
        total,
        total_pages
      }
    };
  }
  /**
   * Retrieves a single guest by ID with full details
   *
   * @param guestId - The guest ID to retrieve
   * @param userId - The authenticated user's ID (for authorization)
   * @returns Guest with relationships and table assignment or null if not found
   * @throws Error if database query fails
   */
  async getGuestById(guestId, userId) {
    const { data: guest, error: guestError } = await this.supabase.from("guests").select(
      `
        *,
        events!inner (
          id,
          user_id
        )
      `
    ).eq("id", guestId).single();
    if (guestError || !guest) {
      return null;
    }
    if (Array.isArray(guest.events)) {
      if (guest.events.length === 0 || guest.events[0].user_id !== userId) {
        return null;
      }
    } else if (guest.events.user_id !== userId) {
      return null;
    }
    const { data: assignment } = await this.supabase.from("seating_assignments").select(
      `
        table_id,
        tables (
          id,
          name
        )
      `
    ).eq("guest_id", guestId).single();
    const { data: relationships } = await this.supabase.from("guest_relationships").select(
      `
        id,
        guest1_id,
        guest2_id,
        relationship_type,
        strength
      `
    ).or(`guest1_id.eq.${guestId},guest2_id.eq.${guestId}`);
    const relationshipInfo = [];
    if (relationships && relationships.length > 0) {
      const relatedGuestIds = relationships.map((r) => r.guest1_id === guestId ? r.guest2_id : r.guest1_id);
      const { data: relatedGuests } = await this.supabase.from("guests").select("id, name").in("id", relatedGuestIds);
      const guestNameMap = new Map(relatedGuests?.map((g) => [g.id, g.name]) || []);
      for (const rel of relationships) {
        const relatedGuestId = rel.guest1_id === guestId ? rel.guest2_id : rel.guest1_id;
        relationshipInfo.push({
          id: rel.id,
          guest_id: relatedGuestId,
          guest_name: guestNameMap.get(relatedGuestId) || "",
          relationship_type: rel.relationship_type,
          strength: rel.strength
        });
      }
    }
    const { events, ...guestData } = guest;
    return {
      ...guestData,
      relationships: relationshipInfo,
      table_assignment: assignment && assignment.tables && !Array.isArray(assignment.tables) ? {
        table_id: assignment.table_id,
        table_name: assignment.tables.name
      } : null
    };
  }
  /**
   * Creates a new guest for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param guestData - Guest data to create
   * @returns Created guest
   * @throws Error if database query fails or event doesn't belong to user
   */
  async createGuest(eventId, userId, guestData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const { data: guest, error: createError } = await this.supabase.from("guests").insert({
      event_id: eventId,
      ...guestData
    }).select().single();
    if (createError) {
      throw new Error(`Failed to create guest: ${createError.message}`);
    }
    return guest;
  }
  /**
   * Creates multiple guests in bulk for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param bulkData - Bulk guest data
   * @returns Summary of created guests and any errors
   * @throws Error if database query fails or event doesn't belong to user
   */
  async bulkCreateGuests(eventId, userId, bulkData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const guestsToInsert = bulkData.guests.map((g) => ({
      event_id: eventId,
      ...g
    }));
    const { data: createdGuests, error: insertError } = await this.supabase.from("guests").insert(guestsToInsert).select("id, name");
    if (insertError) {
      throw new Error(`Failed to create guests: ${insertError.message}`);
    }
    const createdSummaries = createdGuests?.map((g) => ({
      id: g.id,
      name: g.name
    })) || [];
    return {
      created: createdSummaries.length,
      failed: 0,
      guests: createdSummaries,
      errors: []
    };
  }
}

export { BulkCreateGuestsSchema as B, CreateGuestSchema as C, GuestsService as G, ListGuestsQuerySchema as L, UpdateGuestSchema as U };
