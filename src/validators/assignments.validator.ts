import { z } from "zod";

/**
 * Validation schema for listing seating assignments with filtering
 */
export const ListAssignmentsQuerySchema = z.object({
  table_id: z.coerce
    .number({ invalid_type_error: "Table ID must be a number" })
    .int({ message: "Table ID must be an integer" })
    .positive({ message: "Table ID must be positive" })
    .optional(),

  guest_id: z.coerce
    .number({ invalid_type_error: "Guest ID must be a number" })
    .int({ message: "Guest ID must be an integer" })
    .positive({ message: "Guest ID must be positive" })
    .optional(),
});

/**
 * Validation schema for creating a seating assignment
 */
export const CreateAssignmentSchema = z.object({
  guest_id: z
    .number({ required_error: "Guest ID is required", invalid_type_error: "Guest ID must be a number" })
    .int({ message: "Guest ID must be an integer" })
    .positive({ message: "Guest ID must be positive" }),

  table_id: z
    .number({ required_error: "Table ID is required", invalid_type_error: "Table ID must be a number" })
    .int({ message: "Table ID must be an integer" })
    .positive({ message: "Table ID must be positive" }),

  seat_position: z
    .number({ invalid_type_error: "Seat position must be a number" })
    .int({ message: "Seat position must be an integer" })
    .positive({ message: "Seat position must be positive" })
    .optional()
    .nullable(),
});

/**
 * Validation schema for bulk updating assignments
 */
export const BulkUpdateAssignmentsSchema = z.object({
  assignments: z
    .array(CreateAssignmentSchema, { required_error: "Assignments array is required" })
    .min(1, { message: "At least one assignment must be provided" })
    .max(200, { message: "Cannot update more than 200 assignments at once" }),
});

/**
 * Validation schema for updating a seating assignment
 */
export const UpdateAssignmentSchema = z.object({
  table_id: z
    .number({ invalid_type_error: "Table ID must be a number" })
    .int({ message: "Table ID must be an integer" })
    .positive({ message: "Table ID must be positive" })
    .optional(),

  seat_position: z
    .number({ invalid_type_error: "Seat position must be a number" })
    .int({ message: "Seat position must be an integer" })
    .positive({ message: "Seat position must be positive" })
    .optional()
    .nullable(),
});

// Export types for TypeScript
export type ListAssignmentsQueryDto = z.infer<typeof ListAssignmentsQuerySchema>;
export type CreateAssignmentDto = z.infer<typeof CreateAssignmentSchema>;
export type BulkUpdateAssignmentsDto = z.infer<typeof BulkUpdateAssignmentsSchema>;
export type UpdateAssignmentDto = z.infer<typeof UpdateAssignmentSchema>;
