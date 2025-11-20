import { z } from "zod";

/**
 * Table type enum schema
 */
export const TableTypeSchema = z.enum(
  ['round', 'rectangle', 'square', 'oval', 'u_shape', 'banquet', 'wave'],
  {
    errorMap: () => ({
      message: "Table type must be one of: round, rectangle, square, oval, u_shape, banquet, wave"
    })
  }
);

/**
 * Validation schema for listing tables with sorting
 */
export const ListTablesQuerySchema = z.object({
  sort: z
    .enum(["name", "capacity"], {
      errorMap: () => ({ message: "Sort field must be name or capacity" }),
    })
    .optional()
    .default("name"),

  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "Order must be asc or desc" }),
    })
    .optional()
    .default("asc"),
});

/**
 * Validation schema for creating a single table
 */
export const CreateTableSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim(),

  capacity: z
    .number({ required_error: "Capacity is required", invalid_type_error: "Capacity must be a number" })
    .int({ message: "Capacity must be an integer" })
    .min(1, { message: "Capacity must be at least 1" })
    .max(100, { message: "Capacity must not exceed 100" }),

  table_type: TableTypeSchema.default('rectangle'),
});

/**
 * Validation schema for bulk creating tables
 */
export const BulkCreateTablesSchema = z.object({
  tables: z
    .array(CreateTableSchema, { required_error: "Tables array is required" })
    .min(1, { message: "At least one table must be provided" })
    .max(50, { message: "Cannot create more than 50 tables at once" }),
});

/**
 * Validation schema for updating a table
 * All fields are optional since this is a PATCH operation
 */
export const UpdateTableSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim()
    .optional(),

  capacity: z
    .number({ invalid_type_error: "Capacity must be a number" })
    .int({ message: "Capacity must be an integer" })
    .min(1, { message: "Capacity must be at least 1" })
    .max(100, { message: "Capacity must not exceed 100" })
    .optional(),

  table_type: TableTypeSchema.optional(),
});

// Export types for TypeScript
export type ListTablesQueryDto = z.infer<typeof ListTablesQuerySchema>;
export type CreateTableDto = z.infer<typeof CreateTableSchema>;
export type BulkCreateTablesDto = z.infer<typeof BulkCreateTablesSchema>;
export type UpdateTableDto = z.infer<typeof UpdateTableSchema>;
