globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, b as coerce, n as numberType, d as arrayType } from './astro/server_D4BVXBCg.mjs';

const ListAssignmentsQuerySchema = objectType({
  table_id: coerce.number({ invalid_type_error: "Table ID must be a number" }).int({ message: "Table ID must be an integer" }).positive({ message: "Table ID must be positive" }).optional(),
  guest_id: coerce.number({ invalid_type_error: "Guest ID must be a number" }).int({ message: "Guest ID must be an integer" }).positive({ message: "Guest ID must be positive" }).optional()
});
const CreateAssignmentSchema = objectType({
  guest_id: numberType({ required_error: "Guest ID is required", invalid_type_error: "Guest ID must be a number" }).int({ message: "Guest ID must be an integer" }).positive({ message: "Guest ID must be positive" }),
  table_id: numberType({ required_error: "Table ID is required", invalid_type_error: "Table ID must be a number" }).int({ message: "Table ID must be an integer" }).positive({ message: "Table ID must be positive" }),
  seat_position: numberType({ invalid_type_error: "Seat position must be a number" }).int({ message: "Seat position must be an integer" }).positive({ message: "Seat position must be positive" }).optional().nullable()
});
const BulkUpdateAssignmentsSchema = objectType({
  assignments: arrayType(CreateAssignmentSchema, { required_error: "Assignments array is required" }).min(1, { message: "At least one assignment must be provided" }).max(200, { message: "Cannot update more than 200 assignments at once" })
});
const UpdateAssignmentSchema = objectType({
  table_id: numberType({ invalid_type_error: "Table ID must be a number" }).int({ message: "Table ID must be an integer" }).positive({ message: "Table ID must be positive" }).optional(),
  seat_position: numberType({ invalid_type_error: "Seat position must be a number" }).int({ message: "Seat position must be an integer" }).positive({ message: "Seat position must be positive" }).optional().nullable()
});

export { BulkUpdateAssignmentsSchema as B, CreateAssignmentSchema as C, ListAssignmentsQuerySchema as L, UpdateAssignmentSchema as U };
