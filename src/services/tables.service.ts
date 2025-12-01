/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  ListTablesResponseDto,
  ListTablesQueryDto,
  TableWithOccupancyDto,
  CreateTableDto,
  BulkCreateTablesDto,
  BulkCreateTablesResponseDto,
  CreatedTableSummary,
} from "../types";

/**
 * Service class for managing table-related operations
 *
 * Handles business logic for table queries including:
 * - Fetching tables with occupancy info
 * - Sorting
 * - Bulk operations
 */
export class TablesService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves all tables for a specific event with occupancy information
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for sorting
   * @returns List of tables with occupancy stats
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listTablesForEvent(eventId: number, userId: string, query: ListTablesQueryDto): Promise<ListTablesResponseDto> {
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
    const sort = query.sort ?? "name";
    const order = query.order ?? "asc";

    // Build query for tables
    let dataQuery = this.supabase.from("tables").select("*").eq("event_id", eventId);

    // Apply sorting
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });

    // Execute the query
    const { data: tables, error: tablesError } = await dataQuery;

    if (tablesError) {
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }

    // Fetch assignment counts for each table
    const tableIds = tables?.map((t) => t.id) || [];
    const tablesWithOccupancy: TableWithOccupancyDto[] = [];

    if (tableIds.length > 0) {
      // Fetch assignments
      const { data: assignments } = await this.supabase
        .from("seating_assignments")
        .select("table_id")
        .in("table_id", tableIds);

      // Create assignment count map
      const assignmentCountMap = new Map<number, number>();
      assignments?.forEach((a) => {
        assignmentCountMap.set(a.table_id, (assignmentCountMap.get(a.table_id) || 0) + 1);
      });

      // Merge tables with their occupancy stats
      for (const table of tables || []) {
        const assignedCount = assignmentCountMap.get(table.id) || 0;
        tablesWithOccupancy.push({
          ...table,
          assigned_count: assignedCount,
          available_seats: table.capacity - assignedCount,
        });
      }
    }

    return {
      data: tablesWithOccupancy,
    };
  }

  /**
   * Retrieves a single table by ID with occupancy information
   *
   * @param tableId - The table ID to retrieve
   * @param userId - The authenticated user's ID (for authorization)
   * @returns Table with occupancy stats or null if not found
   * @throws Error if database query fails
   */
  async getTableById(tableId: number, userId: string): Promise<TableWithOccupancyDto | null> {
    // Fetch the table with event ownership check
    const { data: table, error: tableError } = await this.supabase
      .from("tables")
      .select(
        `
        *,
        events!inner (
          id,
          user_id
        )
      `
      )
      .eq("id", tableId)
      .single();

    if (tableError || !table) {
      return null;
    }

    // Check if event belongs to user
    if (Array.isArray(table.events)) {
      if (table.events.length === 0 || table.events[0].user_id !== userId) {
        return null;
      }
    } else if (table.events.user_id !== userId) {
      return null;
    }

    // Fetch assignment count
    const { count: assignedCount } = await this.supabase
      .from("seating_assignments")
      .select("*", { count: "exact", head: true })
      .eq("table_id", tableId);

    // Remove the events property from the response
    const { events, ...tableData } = table as any;

    return {
      ...tableData,
      assigned_count: assignedCount || 0,
      available_seats: tableData.capacity - (assignedCount || 0),
    };
  }

  /**
   * Creates a new table for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param tableData - Table data to create
   * @returns Created table
   * @throws Error if database query fails or event doesn't belong to user
   */
  async createTable(eventId: number, userId: string, tableData: CreateTableDto) {
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

    // Create table
    const { data: table, error: createError } = await this.supabase
      .from("tables")
      .insert({
        event_id: eventId,
        ...tableData,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create table: ${createError.message}`);
    }

    return table;
  }

  /**
   * Creates multiple tables in bulk for an event
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param bulkData - Bulk table data
   * @returns Summary of created tables
   * @throws Error if database query fails or event doesn't belong to user
   */
  async bulkCreateTables(
    eventId: number,
    userId: string,
    bulkData: BulkCreateTablesDto
  ): Promise<BulkCreateTablesResponseDto> {
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

    // Prepare table inserts
    const tablesToInsert = bulkData.tables.map((t) => ({
      event_id: eventId,
      ...t,
    }));

    // Insert all tables
    const { data: createdTables, error: insertError } = await this.supabase
      .from("tables")
      .insert(tablesToInsert)
      .select("id, name, capacity, table_type");

    if (insertError) {
      throw new Error(`Failed to create tables: ${insertError.message}`);
    }

    const createdSummaries: CreatedTableSummary[] =
      createdTables?.map((t) => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        table_type: t.table_type,
      })) || [];

    return {
      created: createdSummaries.length,
      tables: createdSummaries,
    };
  }
}
