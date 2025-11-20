import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  ListAssignmentsResponseDto,
  ListAssignmentsQueryDto,
  SeatingAssignmentWithDetailsDto,
  CreateAssignmentDto,
  BulkUpdateAssignmentsDto,
  BulkUpdateAssignmentsResponseDto,
  ClearAssignmentsResponseDto,
} from "../types";

/**
 * Service class for managing seating assignment operations
 */
export class AssignmentsService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves all seating assignments for a specific event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for filtering
   * @returns List of assignments with guest and table details
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listAssignmentsForEvent(
    eventId: number,
    userId: string,
    query: ListAssignmentsQueryDto
  ): Promise<ListAssignmentsResponseDto> {
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

    // Build query for assignments
    let dataQuery = this.supabase
      .from("seating_assignments")
      .select(
        `
        id,
        event_id,
        guest_id,
        table_id,
        seat_position,
        guests (id, name),
        tables (id, name)
      `
      )
      .eq("event_id", eventId);

    // Apply filters
    if (query.table_id) {
      dataQuery = dataQuery.eq("table_id", query.table_id);
    }

    if (query.guest_id) {
      dataQuery = dataQuery.eq("guest_id", query.guest_id);
    }

    // Execute query
    const { data: assignments, error: assignmentsError } = await dataQuery;

    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
    }

    // Format assignments with details
    const assignmentsWithDetails: SeatingAssignmentWithDetailsDto[] =
      assignments?.map((a) => ({
        id: a.id,
        event_id: a.event_id,
        guest: {
          id: a.guest_id,
          name: Array.isArray(a.guests) ? a.guests[0]?.name || "" : a.guests?.name || "",
        },
        table: {
          id: a.table_id,
          name: Array.isArray(a.tables) ? a.tables[0]?.name || "" : a.tables?.name || "",
        },
        seat_position: a.seat_position,
      })) || [];

    return {
      data: assignmentsWithDetails,
    };
  }

  /**
   * Creates a new seating assignment
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param assignmentData - Assignment data to create
   * @returns Created assignment
   * @throws Error if database query fails
   */
  async createAssignment(eventId: number, userId: string, assignmentData: CreateAssignmentDto) {
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

    // Verify guest and table belong to this event
    const { data: guest } = await this.supabase
      .from("guests")
      .select("id")
      .eq("id", assignmentData.guest_id)
      .eq("event_id", eventId)
      .single();

    if (!guest) {
      throw new Error("GUEST_NOT_FOUND");
    }

    const { data: table } = await this.supabase
      .from("tables")
      .select("id, capacity")
      .eq("id", assignmentData.table_id)
      .eq("event_id", eventId)
      .single();

    if (!table) {
      throw new Error("TABLE_NOT_FOUND");
    }

    // Validate seat_position if provided
    if (assignmentData.seat_position !== undefined && assignmentData.seat_position !== null) {
      // Check seat_position is within table capacity
      if (assignmentData.seat_position > table.capacity) {
        throw new Error(`SEAT_EXCEEDS_CAPACITY:${table.capacity}`);
      }

      // Check if seat is already taken
      const { data: existingSeat } = await this.supabase
        .from("seating_assignments")
        .select("id, guest_id")
        .eq("table_id", assignmentData.table_id)
        .eq("seat_position", assignmentData.seat_position)
        .maybeSingle();

      if (existingSeat && existingSeat.guest_id !== assignmentData.guest_id) {
        throw new Error("SEAT_ALREADY_TAKEN");
      }
    }

    // Check if table has capacity (only if no specific seat position)
    if (!assignmentData.seat_position) {
      const { count: assignedCount } = await this.supabase
        .from("seating_assignments")
        .select("*", { count: "exact", head: true })
        .eq("table_id", assignmentData.table_id);

      if ((assignedCount || 0) >= table.capacity) {
        throw new Error("TABLE_FULL");
      }
    }

    // Create assignment (upsert to handle existing assignments)
    const { data: assignment, error: createError } = await this.supabase
      .from("seating_assignments")
      .upsert({
        event_id: eventId,
        ...assignmentData,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create assignment: ${createError.message}`);
    }

    return assignment;
  }

  /**
   * Creates or updates multiple assignments in bulk
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param bulkData - Bulk assignment data
   * @returns Summary of updated assignments
   * @throws Error if database query fails
   */
  async bulkUpdateAssignments(
    eventId: number,
    userId: string,
    bulkData: BulkUpdateAssignmentsDto
  ): Promise<BulkUpdateAssignmentsResponseDto> {
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

    // Prepare assignments with event_id
    const assignmentsToUpsert = bulkData.assignments.map((a) => ({
      event_id: eventId,
      ...a,
    }));

    // Upsert all assignments
    const { data: updatedAssignments, error: upsertError } = await this.supabase
      .from("seating_assignments")
      .upsert(assignmentsToUpsert)
      .select();

    if (upsertError) {
      throw new Error(`Failed to update assignments: ${upsertError.message}`);
    }

    return {
      updated: updatedAssignments?.length || 0,
      optimization_impact: {
        overall_score: 0, // Placeholder - would calculate based on relationships
        conflicts: [],
      },
    };
  }

  /**
   * Clears all seating assignments for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @returns Summary of deleted assignments
   * @throws Error if database query fails
   */
  async clearAllAssignments(eventId: number, userId: string): Promise<ClearAssignmentsResponseDto> {
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

    // Count assignments before deletion
    const { count } = await this.supabase
      .from("seating_assignments")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    // Delete all assignments
    const { error: deleteError } = await this.supabase.from("seating_assignments").delete().eq("event_id", eventId);

    if (deleteError) {
      throw new Error(`Failed to clear assignments: ${deleteError.message}`);
    }

    return {
      deleted: count || 0,
      message: `Successfully cleared ${count || 0} seating assignments`,
    };
  }
}
