import { z } from "zod";

/**
 * Validation schema for optimization factors
 *
 * Each weight is a number from 0-10 where:
 * - 0 = Factor not considered
 * - 10 = Maximum importance
 */
export const OptimizationFactorsSchema = z.object({
  relationships_weight: z
    .number()
    .min(0, { message: "Weight must be at least 0" })
    .max(10, { message: "Weight must not exceed 10" })
    .optional()
    .default(8),

  age_compatibility_weight: z
    .number()
    .min(0, { message: "Weight must be at least 0" })
    .max(10, { message: "Weight must not exceed 10" })
    .optional()
    .default(5),

  drinking_habits_weight: z
    .number()
    .min(0, { message: "Weight must be at least 0" })
    .max(10, { message: "Weight must not exceed 10" })
    .optional()
    .default(3),

  hobbies_weight: z
    .number()
    .min(0, { message: "Weight must be at least 0" })
    .max(10, { message: "Weight must not exceed 10" })
    .optional()
    .default(6),

  dietary_restrictions_weight: z
    .number()
    .min(0, { message: "Weight must be at least 0" })
    .max(10, { message: "Weight must not exceed 10" })
    .optional()
    .default(4),
});

/**
 * Validation schema for seating constraints
 */
export const SeatingConstraintsSchema = z.object({
  must_seat_together: z
    .array(z.array(z.number().int().positive()))
    .optional()
    .describe("Array of guest ID arrays that must be seated together"),

  must_separate: z
    .array(z.array(z.number().int().positive()))
    .optional()
    .describe("Array of guest ID arrays that must be kept separate"),
});

/**
 * Validation schema for generating a seating plan
 */
export const GenerateSeatingPlanRequestSchema = z.object({
  optimization_factors: OptimizationFactorsSchema.optional(),

  preserve_assignments: z
    .array(z.number().int().positive())
    .optional()
    .describe("Array of guest IDs whose current assignments should be preserved"),

  constraints: SeatingConstraintsSchema.optional(),
});

/**
 * Validation schema for a single assignment change
 */
export const AssignmentChangeSchema = z.object({
  guest_id: z.number().int().positive({ message: "Guest ID must be a positive integer" }),
  from_table_id: z.number().int().positive({ message: "From table ID must be a positive integer" }).nullable(),
  to_table_id: z.number().int().positive({ message: "To table ID must be a positive integer" }),
});

/**
 * Validation schema for validating assignment impact
 */
export const ValidateAssignmentImpactRequestSchema = z.object({
  changes: z
    .array(AssignmentChangeSchema)
    .min(1, { message: "At least one change must be provided" })
    .max(50, { message: "Cannot validate more than 50 changes at once" }),
});

/**
 * Inferred TypeScript types
 */
export type OptimizationFactors = z.infer<typeof OptimizationFactorsSchema>;
export type SeatingConstraints = z.infer<typeof SeatingConstraintsSchema>;
export type GenerateSeatingPlanRequest = z.infer<typeof GenerateSeatingPlanRequestSchema>;
export type AssignmentChange = z.infer<typeof AssignmentChangeSchema>;
export type ValidateAssignmentImpactRequest = z.infer<typeof ValidateAssignmentImpactRequestSchema>;
