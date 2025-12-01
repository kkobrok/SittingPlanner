import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  ListGuestsResponseDto,
  ListGuestsQueryDto,
  GuestWithAssignmentDto,
  GuestDetailDto,
  CreateGuestDto,
  BulkCreateGuestsDto,
  BulkCreateGuestsResponseDto,
  CreatedGuestSummary,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ValidationErrorDetail,
} from "../types";

/**
 * Service class for managing guest-related operations
 *
 * Handles business logic for guest queries including:
 * - Pagination
 * - Filtering and searching
 * - Sorting
 * - Fetching table assignments
 * - Bulk operations
 */
export class GuestsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves a paginated list of guests for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of guests with table assignments
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listGuestsForEvent(eventId: number, userId: string, query: ListGuestsQueryDto): Promise<ListGuestsResponseDto> {
    // Verify event belongs to user
    const { data: event } = await this.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // Apply defaults to query parameters
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";
    const search = query.search;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build base query for guests
    let dataQuery = this.supabase.from("guests").select("*", { count: "exact" }).eq("event_id", eventId);

    // Apply search filter if provided
    if (search) {
      dataQuery = dataQuery.ilike("name", `%${search}%`);
    }

    // Apply sorting
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });

    // Apply pagination using range
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // Execute the query
    const { data: guests, error: guestsError, count } = await dataQuery;

    if (guestsError) {
      throw new Error(`Failed to fetch guests: ${guestsError.message}`);
    }

    // Fetch table assignments for all guests
    const guestIds = guests?.map((g) => g.id) || [];
    const guestsWithAssignments: GuestWithAssignmentDto[] = [];

    if (guestIds.length > 0) {
      // Fetch assignments with table details
      const { data: assignments } = await this.supabase
        .from("seating_assignments")
        .select(
          `
          guest_id,
          table_id,
          tables (
            id,
            name
          )
        `
        )
        .in("guest_id", guestIds);

      // Create assignment lookup map
      const assignmentMap = new Map();
      assignments?.forEach((a) => {
        if (a.tables && !Array.isArray(a.tables)) {
          assignmentMap.set(a.guest_id, {
            table_id: a.table_id,
            table_name: a.tables.name,
          });
        }
      });

      // Merge guests with their assignments
      for (const guest of guests || []) {
        guestsWithAssignments.push({
          ...guest,
          table_assignment: assignmentMap.get(guest.id) || null,
        });
      }
    }

    // Calculate pagination metadata
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: guestsWithAssignments,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
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
  async getGuestById(guestId: number, userId: string): Promise<GuestDetailDto | null> {
    // Fetch the guest with event ownership check
    const { data: guest, error: guestError } = await this.supabase
      .from("guests")
      .select(
        `
        *,
        events!inner (
          id,
          user_id
        )
      `
      )
      .eq("id", guestId)
      .single();

    if (guestError || !guest) {
      return null;
    }

    // Check if event belongs to user
    if (Array.isArray(guest.events)) {
      if (guest.events.length === 0 || guest.events[0].user_id !== userId) {
        return null;
      }
    } else if (guest.events.user_id !== userId) {
      return null;
    }

    // Fetch table assignment
    const { data: assignment } = await this.supabase
      .from("seating_assignments")
      .select(
        `
        table_id,
        tables (
          id,
          name
        )
      `
      )
      .eq("guest_id", guestId)
      .single();

    // Fetch relationships
    const { data: relationships } = await this.supabase
      .from("guest_relationships")
      .select(
        `
        id,
        guest1_id,
        guest2_id,
        relationship_type,
        strength
      `
      )
      .or(`guest1_id.eq.${guestId},guest2_id.eq.${guestId}`);

    // Fetch related guest names
    const relationshipInfo = [];
    if (relationships && relationships.length > 0) {
      const relatedGuestIds = relationships.map((r) => (r.guest1_id === guestId ? r.guest2_id : r.guest1_id));

      const { data: relatedGuests } = await this.supabase.from("guests").select("id, name").in("id", relatedGuestIds);

      const guestNameMap = new Map(relatedGuests?.map((g) => [g.id, g.name]) || []);

      for (const rel of relationships) {
        const relatedGuestId = rel.guest1_id === guestId ? rel.guest2_id : rel.guest1_id;
        relationshipInfo.push({
          id: rel.id,
          guest_id: relatedGuestId,
          guest_name: guestNameMap.get(relatedGuestId) || "",
          relationship_type: rel.relationship_type,
          strength: rel.strength,
        });
      }
    }

    // Remove the events property from the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { events, ...guestData } = guest as any;

    return {
      ...guestData,
      relationships: relationshipInfo,
      table_assignment:
        assignment && assignment.tables && !Array.isArray(assignment.tables)
          ? {
              table_id: assignment.table_id,
              table_name: assignment.tables.name,
            }
          : null,
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
  async createGuest(eventId: number, userId: string, guestData: CreateGuestDto) {
    // Verify event belongs to user
    const { data: event } = await this.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // Create guest
    const { data: guest, error: createError } = await this.supabase
      .from("guests")
      .insert({
        event_id: eventId,
        ...guestData,
      })
      .select()
      .single();

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
  async bulkCreateGuests(
    eventId: number,
    userId: string,
    bulkData: BulkCreateGuestsDto
  ): Promise<BulkCreateGuestsResponseDto> {
    // Verify event belongs to user
    const { data: event } = await this.supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // Prepare guest inserts
    const guestsToInsert = bulkData.guests.map((g) => ({
      event_id: eventId,
      ...g,
    }));

    // Insert all guests
    const { data: createdGuests, error: insertError } = await this.supabase
      .from("guests")
      .insert(guestsToInsert)
      .select("id, name");

    if (insertError) {
      throw new Error(`Failed to create guests: ${insertError.message}`);
    }

    const createdSummaries: CreatedGuestSummary[] =
      createdGuests?.map((g) => ({
        id: g.id,
        name: g.name,
      })) || [];

    return {
      created: createdSummaries.length,
      failed: 0,
      guests: createdSummaries,
      errors: [],
    };
  }
}
