import { z } from "zod";

/**
 * Validation schema for List Events query parameters
 *
 * Validates and coerces query parameters with the following rules:
 * - page: Positive integer >= 1 (default: 1)
 * - limit: Integer between 1-100 (default: 20)
 * - sort: One of allowed fields (default: "created_at")
 * - order: "asc" or "desc" (default: "desc")
 * - search: String max 255 chars (optional)
 */
export const ListEventsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int({ message: "Page must be an integer" })
    .positive({ message: "Page must be a positive number" })
    .optional()
    .default(1),

  limit: z.coerce
    .number()
    .int({ message: "Limit must be an integer" })
    .min(1, { message: "Limit must be at least 1" })
    .max(100, { message: "Limit must not exceed 100" })
    .optional()
    .default(20),

  sort: z
    .enum(["created_at", "updated_at", "date", "name"], {
      errorMap: () => ({
        message: "Sort field must be one of: created_at, updated_at, date, name",
      }),
    })
    .optional()
    .default("created_at"),

  order: z
    .enum(["asc", "desc"], {
      errorMap: () => ({
        message: "Order must be either asc or desc",
      }),
    })
    .optional()
    .default("desc"),

  search: z.string().max(255, { message: "Search term must not exceed 255 characters" }).optional(),
});

/**
 * Inferred TypeScript type from the validation schema
 */
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
