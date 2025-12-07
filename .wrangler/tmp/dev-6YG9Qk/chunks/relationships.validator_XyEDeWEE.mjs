globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, b as coerce, s as stringType, n as numberType } from './astro/server_D4BVXBCg.mjs';

const ListRelationshipsQuerySchema = objectType({
  page: coerce.number({ invalid_type_error: "Page must be a number" }).int({ message: "Page must be an integer" }).positive({ message: "Page must be positive" }).optional().default(1),
  limit: coerce.number({ invalid_type_error: "Limit must be a number" }).int({ message: "Limit must be an integer" }).min(1, { message: "Limit must be at least 1" }).max(100, { message: "Limit cannot exceed 100" }).optional().default(20),
  guest_id: coerce.number({ invalid_type_error: "Guest ID must be a number" }).int({ message: "Guest ID must be an integer" }).positive({ message: "Guest ID must be positive" }).optional(),
  relationship_type: stringType().max(100, { message: "Relationship type must not exceed 100 characters" }).optional(),
  min_strength: coerce.number({ invalid_type_error: "Min strength must be a number" }).int({ message: "Min strength must be an integer" }).min(1, { message: "Min strength must be at least 1" }).max(10, { message: "Min strength must not exceed 10" }).optional()
});
const CreateRelationshipSchema = objectType({
  guest1_id: numberType({ required_error: "Guest 1 ID is required", invalid_type_error: "Guest 1 ID must be a number" }).int({ message: "Guest 1 ID must be an integer" }).positive({ message: "Guest 1 ID must be positive" }),
  guest2_id: numberType({ required_error: "Guest 2 ID is required", invalid_type_error: "Guest 2 ID must be a number" }).int({ message: "Guest 2 ID must be an integer" }).positive({ message: "Guest 2 ID must be positive" }),
  relationship_type: stringType({ required_error: "Relationship type is required" }).min(1, { message: "Relationship type cannot be empty" }).max(100, { message: "Relationship type must not exceed 100 characters" }).trim(),
  strength: numberType({ invalid_type_error: "Strength must be a number" }).int({ message: "Strength must be an integer" }).min(1, { message: "Strength must be at least 1" }).max(10, { message: "Strength must not exceed 10" }).optional().nullable()
}).refine((data) => data.guest1_id !== data.guest2_id, {
  message: "Guest 1 and Guest 2 must be different",
  path: ["guest2_id"]
});
const UpdateRelationshipSchema = objectType({
  relationship_type: stringType().min(1, { message: "Relationship type cannot be empty" }).max(100, { message: "Relationship type must not exceed 100 characters" }).trim().optional(),
  strength: numberType({ invalid_type_error: "Strength must be a number" }).int({ message: "Strength must be an integer" }).min(1, { message: "Strength must be at least 1" }).max(10, { message: "Strength must not exceed 10" }).optional().nullable()
});

export { CreateRelationshipSchema as C, ListRelationshipsQuerySchema as L, UpdateRelationshipSchema as U };
