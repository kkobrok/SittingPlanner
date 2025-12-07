globalThis.process ??= {}; globalThis.process.env ??= {};
class EventsService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Retrieves a paginated list of events for a specific user
   *
   * @param userId - The authenticated user's ID
   * @param query - Query parameters for filtering, sorting, and pagination
   * @returns Paginated list of events with computed statistics
   * @throws Error if database query fails
   */
  async listEventsForUser(userId, query) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";
    const search = query.search;
    const offset = (page - 1) * limit;
    let dataQuery = this.supabase.from("events").select("*", { count: "exact" }).eq("user_id", userId);
    if (search) {
      dataQuery = dataQuery.ilike("name", `%${search}%`);
    }
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });
    dataQuery = dataQuery.range(offset, offset + limit - 1);
    const { data: events, error: eventsError, count } = await dataQuery;
    if (eventsError) {
      throw new Error(`Failed to fetch events: ${eventsError.message}`);
    }
    const eventIds = events?.map((e) => e.id) || [];
    const eventsWithStats = [];
    if (eventIds.length > 0) {
      const { data: guestCounts } = await this.supabase.from("guests").select("event_id").in("event_id", eventIds);
      const { data: tableCounts } = await this.supabase.from("tables").select("event_id").in("event_id", eventIds);
      const { data: assignmentCounts } = await this.supabase.from("seating_assignments").select("event_id").in("event_id", eventIds);
      const guestCountMap = /* @__PURE__ */ new Map();
      const tableCountMap = /* @__PURE__ */ new Map();
      const assignmentCountMap = /* @__PURE__ */ new Map();
      guestCounts?.forEach((g) => {
        guestCountMap.set(g.event_id, (guestCountMap.get(g.event_id) || 0) + 1);
      });
      tableCounts?.forEach((t) => {
        tableCountMap.set(t.event_id, (tableCountMap.get(t.event_id) || 0) + 1);
      });
      assignmentCounts?.forEach((a) => {
        assignmentCountMap.set(a.event_id, (assignmentCountMap.get(a.event_id) || 0) + 1);
      });
      for (const event of events || []) {
        eventsWithStats.push({
          ...event,
          guest_count: guestCountMap.get(event.id) || 0,
          table_count: tableCountMap.get(event.id) || 0,
          assigned_count: assignmentCountMap.get(event.id) || 0
        });
      }
    }
    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    return {
      data: eventsWithStats,
      pagination: {
        page,
        limit,
        total,
        total_pages
      }
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
  async getEventById(eventId, userId) {
    const { data: event, error: eventError } = await this.supabase.from("events").select("*").eq("id", eventId).eq("user_id", userId).single();
    if (eventError || !event) {
      return null;
    }
    const { count: guestCount } = await this.supabase.from("guests").select("*", { count: "exact", head: true }).eq("event_id", eventId);
    const { count: tableCount } = await this.supabase.from("tables").select("*", { count: "exact", head: true }).eq("event_id", eventId);
    const { count: assignmentCount } = await this.supabase.from("seating_assignments").select("*", { count: "exact", head: true }).eq("event_id", eventId);
    return {
      ...event,
      guest_count: guestCount || 0,
      table_count: tableCount || 0,
      assigned_count: assignmentCount || 0
    };
  }
}

export { EventsService as E };
