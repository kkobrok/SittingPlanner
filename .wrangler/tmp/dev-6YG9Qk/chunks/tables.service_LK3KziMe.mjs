globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as enumType, o as objectType, n as numberType, s as stringType, d as arrayType } from './astro/server_D4BVXBCg.mjs';

const TableTypeSchema = enumType(["round", "rectangle", "square", "oval", "u_shape", "banquet", "wave"], {
  errorMap: () => ({
    message: "Table type must be one of: round, rectangle, square, oval, u_shape, banquet, wave"
  })
});
const ListTablesQuerySchema = objectType({
  sort: enumType(["name", "capacity"], {
    errorMap: () => ({ message: "Sort field must be name or capacity" })
  }).optional().default("name"),
  order: enumType(["asc", "desc"], {
    errorMap: () => ({ message: "Order must be asc or desc" })
  }).optional().default("asc")
});
const CreateTableSchema = objectType({
  name: stringType({ required_error: "Name is required" }).min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim(),
  capacity: numberType({ required_error: "Capacity is required", invalid_type_error: "Capacity must be a number" }).int({ message: "Capacity must be an integer" }).min(1, { message: "Capacity must be at least 1" }).max(100, { message: "Capacity must not exceed 100" }),
  table_type: TableTypeSchema.default("rectangle")
});
const BulkCreateTablesSchema = objectType({
  tables: arrayType(CreateTableSchema, { required_error: "Tables array is required" }).min(1, { message: "At least one table must be provided" }).max(50, { message: "Cannot create more than 50 tables at once" })
});
const UpdateTableSchema = objectType({
  name: stringType().min(1, { message: "Name cannot be empty" }).max(255, { message: "Name must not exceed 255 characters" }).trim().optional(),
  capacity: numberType({ invalid_type_error: "Capacity must be a number" }).int({ message: "Capacity must be an integer" }).min(1, { message: "Capacity must be at least 1" }).max(100, { message: "Capacity must not exceed 100" }).optional(),
  table_type: TableTypeSchema.optional()
});

class TablesService {
  constructor(supabase) {
    this.supabase = supabase;
  }
  /**
   * Retrieves all tables for a specific event with occupancy information
   *
   * @param eventId - The event ID
   * @param userId - The authenticated user's ID (for authorization)
   * @param query - Query parameters for sorting
   * @returns List of tables with occupancy stats
   * @throws Error if database query fails or event doesn't belong to user
   */
  async listTablesForEvent(eventId, userId, query) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const sort = query.sort ?? "name";
    const order = query.order ?? "asc";
    let dataQuery = this.supabase.from("tables").select("*").eq("event_id", eventId);
    dataQuery = dataQuery.order(sort, { ascending: order === "asc" });
    const { data: tables, error: tablesError } = await dataQuery;
    if (tablesError) {
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }
    const tableIds = tables?.map((t) => t.id) || [];
    const tablesWithOccupancy = [];
    if (tableIds.length > 0) {
      const { data: assignments } = await this.supabase.from("seating_assignments").select("table_id").in("table_id", tableIds);
      const assignmentCountMap = /* @__PURE__ */ new Map();
      assignments?.forEach((a) => {
        assignmentCountMap.set(a.table_id, (assignmentCountMap.get(a.table_id) || 0) + 1);
      });
      for (const table of tables || []) {
        const assignedCount = assignmentCountMap.get(table.id) || 0;
        tablesWithOccupancy.push({
          ...table,
          assigned_count: assignedCount,
          available_seats: table.capacity - assignedCount
        });
      }
    }
    return {
      data: tablesWithOccupancy
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
  async getTableById(tableId, userId) {
    const { data: table, error: tableError } = await this.supabase.from("tables").select(
      `
        *,
        events!inner (
          id,
          user_id
        )
      `
    ).eq("id", tableId).single();
    if (tableError || !table) {
      return null;
    }
    if (Array.isArray(table.events)) {
      if (table.events.length === 0 || table.events[0].user_id !== userId) {
        return null;
      }
    } else if (table.events.user_id !== userId) {
      return null;
    }
    const { count: assignedCount } = await this.supabase.from("seating_assignments").select("*", { count: "exact", head: true }).eq("table_id", tableId);
    const { events, ...tableData } = table;
    return {
      ...tableData,
      assigned_count: assignedCount || 0,
      available_seats: tableData.capacity - (assignedCount || 0)
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
  async createTable(eventId, userId, tableData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const { data: table, error: createError } = await this.supabase.from("tables").insert({
      event_id: eventId,
      ...tableData
    }).select().single();
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
  async bulkCreateTables(eventId, userId, bulkData) {
    const { data: event } = await this.supabase.from("events").select("id").eq("id", eventId).eq("user_id", userId).single();
    if (!event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const tablesToInsert = bulkData.tables.map((t) => ({
      event_id: eventId,
      ...t
    }));
    const { data: createdTables, error: insertError } = await this.supabase.from("tables").insert(tablesToInsert).select("id, name, capacity, table_type");
    if (insertError) {
      throw new Error(`Failed to create tables: ${insertError.message}`);
    }
    const createdSummaries = createdTables?.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      table_type: t.table_type
    })) || [];
    return {
      created: createdSummaries.length,
      tables: createdSummaries
    };
  }
}

export { BulkCreateTablesSchema as B, CreateTableSchema as C, ListTablesQuerySchema as L, TablesService as T, UpdateTableSchema as U };
