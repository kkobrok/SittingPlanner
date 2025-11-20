import { z } from "zod";

/**
 * Validation schema for listing relationships with pagination and filtering
 */
export const ListRelationshipsQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a number" })
    .int({ message: "Page must be an integer" })
    .positive({ message: "Page must be positive" })
    .optional()
    .default(1),

  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a number" })
    .int({ message: "Limit must be an integer" })
    .min(1, { message: "Limit must be at least 1" })
    .max(100, { message: "Limit cannot exceed 100" })
    .optional()
    .default(20),

  guest_id: z.coerce
    .number({ invalid_type_error: "Guest ID must be a number" })
    .int({ message: "Guest ID must be an integer" })
    .positive({ message: "Guest ID must be positive" })
    .optional(),

  relationship_type: z.string().max(100, { message: "Relationship type must not exceed 100 characters" }).optional(),

  min_strength: z.coerce
    .number({ invalid_type_error: "Min strength must be a number" })
    .int({ message: "Min strength must be an integer" })
    .min(1, { message: "Min strength must be at least 1" })
    .max(10, { message: "Min strength must not exceed 10" })
    .optional(),
});

/**
 * Validation schema for creating a relationship
 */
export const CreateRelationshipSchema = z
  .object({
    guest1_id: z
      .number({ required_error: "Guest 1 ID is required", invalid_type_error: "Guest 1 ID must be a number" })
      .int({ message: "Guest 1 ID must be an integer" })
      .positive({ message: "Guest 1 ID must be positive" }),

    guest2_id: z
      .number({ required_error: "Guest 2 ID is required", invalid_type_error: "Guest 2 ID must be a number" })
      .int({ message: "Guest 2 ID must be an integer" })
      .positive({ message: "Guest 2 ID must be positive" }),

    relationship_type: z
      .string({ required_error: "Relationship type is required" })
      .min(1, { message: "Relationship type cannot be empty" })
      .max(100, { message: "Relationship type must not exceed 100 characters" })
      .trim(),

    strength: z
      .number({ invalid_type_error: "Strength must be a number" })
      .int({ message: "Strength must be an integer" })
      .min(1, { message: "Strength must be at least 1" })
      .max(10, { message: "Strength must not exceed 10" })
      .optional()
      .nullable(),
  })
  .refine((data) => data.guest1_id !== data.guest2_id, {
    message: "Guest 1 and Guest 2 must be different",
    path: ["guest2_id"],
  });

/**
 * Validation schema for updating a relationship
 * All fields are optional since this is a PATCH operation
 */
export const UpdateRelationshipSchema = z.object({
  relationship_type: z
    .string()
    .min(1, { message: "Relationship type cannot be empty" })
    .max(100, { message: "Relationship type must not exceed 100 characters" })
    .trim()
    .optional(),

  strength: z
    .number({ invalid_type_error: "Strength must be a number" })
    .int({ message: "Strength must be an integer" })
    .min(1, { message: "Strength must be at least 1" })
    .max(10, { message: "Strength must not exceed 10" })
    .optional()
    .nullable(),
});

// Export types for TypeScript
export type ListRelationshipsQueryDto = z.infer<typeof ListRelationshipsQuerySchema>;
export type CreateRelationshipDto = z.infer<typeof CreateRelationshipSchema>;
export type UpdateRelationshipDto = z.infer<typeof UpdateRelationshipSchema>;
