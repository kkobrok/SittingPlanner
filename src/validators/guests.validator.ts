import { z } from "zod";

/**
 * Validation schema for listing guests with pagination and filtering
 */
export const ListGuestsQuerySchema = z.object({
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

  sort: z
    .enum(["name"], {
      errorMap: () => ({ message: "Invalid sort field" }),
    })
    .optional()
    .default("name"),

  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({ message: "Order must be asc or desc" }),
    })
    .optional()
    .default("desc"),

  search: z.string().max(255, { message: "Search term must not exceed 255 characters" }).optional(),
});

/**
 * Validation schema for creating a single guest
 */
export const CreateGuestSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim(),

  age_range: z.string().max(50, { message: "Age range must not exceed 50 characters" }).optional().nullable(),

  hobbies_interests: z
    .string()
    .max(1000, { message: "Hobbies/interests must not exceed 1000 characters" })
    .optional()
    .nullable(),

  dietary_restrictions: z
    .string()
    .max(500, { message: "Dietary restrictions must not exceed 500 characters" })
    .optional()
    .nullable(),

  topics_to_avoid: z
    .string()
    .max(500, { message: "Topics to avoid must not exceed 500 characters" })
    .optional()
    .nullable(),

  drinking_habits: z
    .string()
    .max(50, { message: "Drinking habits must not exceed 50 characters" })
    .optional()
    .nullable(),
});

/**
 * Validation schema for bulk creating guests
 */
export const BulkCreateGuestsSchema = z.object({
  guests: z
    .array(CreateGuestSchema, { required_error: "Guests array is required" })
    .min(1, { message: "At least one guest must be provided" })
    .max(100, { message: "Cannot create more than 100 guests at once" }),
});

/**
 * Validation schema for updating a guest
 * All fields are optional since this is a PATCH operation
 */
export const UpdateGuestSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name cannot be empty" })
    .max(255, { message: "Name must not exceed 255 characters" })
    .trim()
    .optional(),

  age_range: z.string().max(50, { message: "Age range must not exceed 50 characters" }).optional().nullable(),

  hobbies_interests: z
    .string()
    .max(1000, { message: "Hobbies/interests must not exceed 1000 characters" })
    .optional()
    .nullable(),

  dietary_restrictions: z
    .string()
    .max(500, { message: "Dietary restrictions must not exceed 500 characters" })
    .optional()
    .nullable(),

  topics_to_avoid: z
    .string()
    .max(500, { message: "Topics to avoid must not exceed 500 characters" })
    .optional()
    .nullable(),

  drinking_habits: z
    .string()
    .max(50, { message: "Drinking habits must not exceed 50 characters" })
    .optional()
    .nullable(),
});

// Export types for TypeScript
export type ListGuestsQueryDto = z.infer<typeof ListGuestsQuerySchema>;
export type CreateGuestDto = z.infer<typeof CreateGuestSchema>;
export type BulkCreateGuestsDto = z.infer<typeof BulkCreateGuestsSchema>;
export type UpdateGuestDto = z.infer<typeof UpdateGuestSchema>;
