import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  ListRelationshipsResponseDto,
  ListRelationshipsQueryDto,
  GuestRelationshipWithDetailsDto,
  CreateRelationshipDto,
} from "../types";

/**
 * Service class for managing guest relationship operations
 */
export class RelationshipsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves a paginated list of relationships for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of relationships with guest details
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listRelationshipsForEvent(
    eventId: number,
    userId: string,
    query: ListRelationshipsQueryDto
  ): Promise<ListRelationshipsResponseDto> {
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
    const offset = (page - 1) * limit;

    // Build base query - get all relationships for guests in this event
    let dataQuery = this.supabase
      .from("guest_relationships")
      .select("*, guests!guest_relationships_guest1_id_fkey(event_id)", { count: "exact" });

    // Filter by event through guest1
    dataQuery = dataQuery.eq("guests.event_id", eventId);

    // Apply filters
    if (query.guest_id) {
      dataQuery = dataQuery.or(`guest1_id.eq.${query.guest_id},guest2_id.eq.${query.guest_id}`);
    }

    if (query.relationship_type) {
      dataQuery = dataQuery.eq("relationship_type", query.relationship_type);
    }

    if (query.min_strength) {
      dataQuery = dataQuery.gte("strength", query.min_strength);
    }

    // Apply pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // Execute query
    const { data: relationships, error: relationshipsError, count } = await dataQuery;

    if (relationshipsError) {
      throw new Error(`Failed to fetch relationships: ${relationshipsError.message}`);
    }

    // Fetch guest details for all relationships
    const relationshipIds = relationships?.map((r) => r.id) || [];
    const relationshipsWithDetails: GuestRelationshipWithDetailsDto[] = [];

    if (relationshipIds.length > 0) {
      // Get all unique guest IDs
      const guestIds = new Set<number>();
      relationships?.forEach((r) => {
        guestIds.add(r.guest1_id);
        guestIds.add(r.guest2_id);
      });

      // Fetch guest names
      const { data: guests } = await this.supabase.from("guests").select("id, name").in("id", Array.from(guestIds));

      const guestMap = new Map(guests?.map((g) => [g.id, g.name]) || []);

      // Build relationships with details
      for (const rel of relationships || []) {
        relationshipsWithDetails.push({
          id: rel.id,
          guest1: {
            id: rel.guest1_id,
            name: guestMap.get(rel.guest1_id) || "",
          },
          guest2: {
            id: rel.guest2_id,
            name: guestMap.get(rel.guest2_id) || "",
          },
          relationship_type: rel.relationship_type,
          strength: rel.strength,
        });
      }
    }

    // Calculate pagination metadata
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: relationshipsWithDetails,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
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
  async createRelationship(eventId: number, userId: string, relationshipData: CreateRelationshipDto) {
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

    // Verify both guests belong to this event
    const { data: guests } = await this.supabase
      .from("guests")
      .select("id")
      .eq("event_id", eventId)
      .in("id", [relationshipData.guest1_id, relationshipData.guest2_id]);

    if (!guests || guests.length !== 2) {
      throw new Error("GUESTS_NOT_FOUND");
    }

    // Create relationship
    const { data: relationship, error: createError } = await this.supabase
      .from("guest_relationships")
      .insert(relationshipData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create relationship: ${createError.message}`);
    }

    return relationship;
  }
}
