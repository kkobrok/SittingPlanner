import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type { ListEventsResponseDto, ListEventsQueryDto, EventWithStatsDto } from "../types";

/**
 * Service class for managing event-related operations
 *
 * Handles business logic for event queries including:
 * - Pagination
 * - Filtering and searching
 * - Sorting
 * - Aggregating statistics (guest count, table count, assigned count)
 */
export class EventsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves a paginated list of events for a specific user
   *
   * @param userId - The authenticated user's ID
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of events with computed statistics
   * @throws Error if database query fails
   */
  async listEventsForUser(userId: string, query: ListEventsQueryDto): Promise<ListEventsResponseDto> {
    // Apply defaults to query parameters
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";
    const search = query.search;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build base query for events
    // Note: RLS policies automatically filter by user_id
    let dataQuery = this.supabase.from("events").select("*", { count: "exact" }).eq("user_id", userId);

    // Apply search filter if provided
    if (search) {
      dataQuery = dataQuery.ilike("name", `%${search}%`);
    }

    // Apply sorting
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });

    // Apply pagination using range
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // Execute the query
    const { data: events, error: eventsError, count } = await dataQuery;

    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }

    // Fetch aggregated statistics for each event
    // This uses a more efficient approach by batching queries
    const eventIds = events?.map((e) => e.id) || [];
    const eventsWithStats: EventWithStatsDto[] = [];

    if (eventIds.length > 0) {
      // Fetch guest counts
      const { data: guestCounts } = await this.supabase.from("guests").select("event_id").in("event_id", eventIds);

      // Fetch table counts
      const { data: tableCounts } = await this.supabase.from("tables").select("event_id").in("event_id", eventIds);

      // Fetch assignment counts
      const { data: assignmentCounts } = await this.supabase
        .from("seating_assignments")
        .select("event_id")
        .in("event_id", eventIds);

      // Create lookup maps for O(1) access
      const guestCountMap = new Map<number, number>();
      const tableCountMap = new Map<number, number>();
      const assignmentCountMap = new Map<number, number>();

      // Count occurrences for each event
      guestCounts?.forEach((g) => {
        guestCountMap.set(g.event_id, (guestCountMap.get(g.event_id) || 0) + 1);
      });

      tableCounts?.forEach((t) => {
        tableCountMap.set(t.event_id, (tableCountMap.get(t.event_id) || 0) + 1);
      });

      assignmentCounts?.forEach((a) => {
        assignmentCountMap.set(a.event_id, (assignmentCountMap.get(a.event_id) || 0) + 1);
      });

      // Merge events with their statistics
      for (const event of events || []) {
        eventsWithStats.push({
          ...event,
          guest_count: guestCountMap.get(event.id) || 0,
          table_count: tableCountMap.get(event.id) || 0,
          assigned_count: assignmentCountMap.get(event.id) || 0,
        });
      }
    }

    // Calculate pagination metadata
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: eventsWithStats,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  /**
   * Retrieves a single event by ID for a specific user
   *
   * @param eventId - The event ID to retrieve
   * @param userId - The authenticated user's ID
   * @returns Event with computed statistics or null if not found
   * @throws Error if database query fails
   */
  async getEventById(eventId: number, userId: string): Promise<EventWithStatsDto | null> {
    // Fetch the event
    const { data: event, error: eventError } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (eventError || !event) {
      return null;
    }

    // Fetch guest count
    const { count: guestCount } = await this.supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    // Fetch table count
    const { count: tableCount } = await this.supabase
      .from("tables")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    // Fetch assignment count
    const { count: assignmentCount } = await this.supabase
      .from("seating_assignments")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    return {
      ...event,
      guest_count: guestCount || 0,
      table_count: tableCount || 0,
      assigned_count: assignmentCount || 0,
    };
  }
}
