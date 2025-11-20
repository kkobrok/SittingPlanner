import { z } from "zod";

/**
 * Validation schema for user registration
 *
 * Rules:
 * - email: Valid email format, max 255 characters
 * - password: Minimum 6 characters (Supabase default requirement)
 */
export const RegisterRequestSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Must be a valid email address" })
    .max(255, { message: "Email must not exceed 255 characters" })
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(72, { message: "Password must not exceed 72 characters" }), // bcrypt limit
});

/**
 * Validation schema for user login
 *
 * Rules:
 * - email: Valid email format
 * - password: Required string
 */
export const LoginRequestSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Must be a valid email address" })
    .toLowerCase()
    .trim(),

  password: z.string({ required_error: "Password is required" }),
});

/**
 * Validation schema for password reset request
 *
 * Rules:
 * - email: Valid email format
 */
export const PasswordResetRequestSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Must be a valid email address" })
    .toLowerCase()
    .trim(),
});

/**
 * Inferred TypeScript types
 */
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
