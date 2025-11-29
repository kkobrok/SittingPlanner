import type { Database } from "./db/database.types";

// ============================================================================
// Database Entity Type Aliases
// ============================================================================

// Extract table row types for easier reference
type EventEntity = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

type GuestEntity = Database["public"]["Tables"]["guests"]["Row"];
type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];
type GuestUpdate = Database["public"]["Tables"]["guests"]["Update"];

type GuestRelationshipEntity = Database["public"]["Tables"]["guest_relationships"]["Row"];
type GuestRelationshipInsert = Database["public"]["Tables"]["guest_relationships"]["Insert"];
type GuestRelationshipUpdate = Database["public"]["Tables"]["guest_relationships"]["Update"];

type TableEntity = Database["public"]["Tables"]["tables"]["Row"];
type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];

type SeatingAssignmentEntity = Database["public"]["Tables"]["seating_assignments"]["Row"];
type SeatingAssignmentInsert = Database["public"]["Tables"]["seating_assignments"]["Insert"];
type SeatingAssignmentUpdate = Database["public"]["Tables"]["seating_assignments"]["Update"];

// ============================================================================
// Common Utility Types
// ============================================================================

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Generic API error response
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: ValidationErrorDetail[] | Record<string, unknown>;
  resource?: string;
  id?: number;
  request_id?: string;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Table Type Enum
// ============================================================================

/**
 * Table shape/type options
 */
export type TableType = "round" | "rectangle" | "square" | "oval" | "u_shape" | "banquet" | "wave";

/**
 * Table type metadata for UI display
 */
export const TABLE_TYPES: Record<TableType, { label: string; icon: string; description: string }> = {
  round: { label: "Round", icon: "○", description: "Circular table" },
  rectangle: { label: "Rectangle", icon: "▭", description: "Rectangular banquet table" },
  square: { label: "Square", icon: "□", description: "Square table" },
  oval: { label: "Oval", icon: "⬭", description: "Oval/elliptical table" },
  u_shape: { label: "U-Shape", icon: "⊐", description: "U-shaped table configuration" },
  banquet: { label: "Banquet", icon: "▬", description: "Long banquet style table" },
  wave: { label: "Wave", icon: "〰", description: "Wave/serpentine table" },
};

// ============================================================================
// Authentication DTOs
// ============================================================================

/**
 * Request DTO for user registration
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
}

/**
 * Request DTO for user login
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Request DTO for password reset
 */
export interface PasswordResetRequestDto {
  email: string;
}

/**
 * User information in auth responses
 */
export interface UserDto {
  id: string;
  email: string;
  created_at?: string;
}

/**
 * Session information in auth responses
 */
export interface SessionDto {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/**
 * Response DTO for registration and login
 */
export interface AuthResponseDto {
  user: UserDto;
  session: SessionDto;
}

/**
 * Response DTO for logout
 */
export interface LogoutResponseDto {
  message: string;
}

/**
 * Response DTO for password reset request
 */
export interface PasswordResetResponseDto {
  message: string;
}

// ============================================================================
// Event DTOs
// ============================================================================

/**
 * Base Event DTO - matches database entity
 */
export type EventDto = EventEntity;

/**
 * Extended Event DTO with computed fields for list and get responses
 */
export interface EventWithStatsDto extends EventDto {
  guest_count?: number;
  table_count?: number;
  assigned_count?: number;
}

/**
 * Request DTO for creating an event
 * Omits id, user_id, created_at, updated_at (auto-generated)
 */
export type CreateEventRequestDto = Pick<EventInsert, "name" | "date">;

/**
 * Request DTO for updating an event
 * All fields optional except user_id and id
 */
export type UpdateEventRequestDto = Partial<Pick<EventUpdate, "name" | "date">>;

/**
 * Response DTO for single event (with stats)
 */
export type GetEventResponseDto = EventWithStatsDto;

/**
 * Response DTO for event list
 */
export type ListEventsResponseDto = PaginatedResponse<EventWithStatsDto>;

/**
 * Query parameters for listing events
 */
export interface ListEventsQueryDto {
  page?: number;
  limit?: number;
  sort?: "created_at" | "updated_at" | "date" | "name";
  order?: "asc" | "desc";
  search?: string;
}

// ============================================================================
// Guest DTOs
// ============================================================================

/**
 * Base Guest DTO - matches database entity
 */
export type GuestDto = GuestEntity;

/**
 * Table assignment info for guest responses
 */
export interface TableAssignmentInfo {
  table_id: number;
  table_name: string;
  seat_position?: number | null;
}

/**
 * Guest relationship info for detailed guest response
 */
export interface GuestRelationshipInfo {
  id: number;
  guest_id: number;
  guest_name: string;
  relationship_type: string;
  strength: number | null;
}

/**
 * Extended Guest DTO with optional table assignment
 */
export interface GuestWithAssignmentDto extends GuestDto {
  table_assignment?: TableAssignmentInfo | null;
}

/**
 * Detailed Guest DTO with relationships and assignment
 */
export interface GuestDetailDto extends GuestDto {
  relationships?: GuestRelationshipInfo[];
  table_assignment?: TableAssignmentInfo | null;
}

/**
 * Request DTO for creating a guest
 * Omits id and event_id (event_id comes from route param)
 */
export type CreateGuestRequestDto = Omit<GuestInsert, "id" | "event_id">;

/**
 * Request DTO for updating a guest
 * All fields optional except id and event_id
 */
export type UpdateGuestRequestDto = Omit<Partial<GuestUpdate>, "id" | "event_id">;

/**
 * Single guest item for bulk create
 */
export type BulkGuestItem = Omit<GuestInsert, "id" | "event_id">;

/**
 * Request DTO for bulk guest creation
 */
export interface BulkCreateGuestsRequestDto {
  guests: BulkGuestItem[];
}

/**
 * Created guest summary for bulk response
 */
export interface CreatedGuestSummary {
  id: number;
  name: string;
}

/**
 * Response DTO for bulk guest creation
 */
export interface BulkCreateGuestsResponseDto {
  created: number;
  failed: number;
  guests: CreatedGuestSummary[];
  errors: ValidationErrorDetail[];
}

/**
 * Response DTO for guest list
 */
export type ListGuestsResponseDto = PaginatedResponse<GuestWithAssignmentDto>;

/**
 * Query parameters for listing guests
 */
export interface ListGuestsQueryDto {
  page?: number;
  limit?: number;
  sort?: "name" | "age_range";
  order?: "asc" | "desc";
  search?: string;
  age_range?: string;
  drinking_habits?: string;
  assigned?: boolean;
}

// ============================================================================
// Guest Relationship DTOs
// ============================================================================

/**
 * Base Guest Relationship DTO - matches database entity
 */
export type GuestRelationshipDto = GuestRelationshipEntity;

/**
 * Guest summary for relationship responses
 */
export interface GuestSummary {
  id: number;
  name: string;
}

/**
 * Extended Guest Relationship DTO with guest details
 */
export interface GuestRelationshipWithDetailsDto {
  id: number;
  guest1: GuestSummary;
  guest2: GuestSummary;
  relationship_type: string;
  strength: number | null;
}

/**
 * Request DTO for creating a relationship
 */
export type CreateRelationshipRequestDto = Omit<GuestRelationshipInsert, "id">;

/**
 * Request DTO for updating a relationship
 */
export type UpdateRelationshipRequestDto = Partial<Pick<GuestRelationshipUpdate, "relationship_type" | "strength">>;

/**
 * Response DTO for relationship list
 */
export type ListRelationshipsResponseDto = PaginatedResponse<GuestRelationshipWithDetailsDto>;

/**
 * Query parameters for listing relationships
 */
export interface ListRelationshipsQueryDto {
  page?: number;
  limit?: number;
  guest_id?: number;
  relationship_type?: string;
  min_strength?: number;
}

// ============================================================================
// Table DTOs
// ============================================================================

/**
 * Base Table DTO - matches database entity
 */
export type TableDto = TableEntity;

/**
 * Extended Table DTO with computed occupancy fields
 */
export interface TableWithOccupancyDto extends TableDto {
  assigned_count: number;
  available_seats: number;
}

/**
 * Request DTO for creating a table
 * Omits id and event_id (event_id comes from route param)
 */
export type CreateTableRequestDto = Omit<TableInsert, "id" | "event_id">;

/**
 * Request DTO for updating a table
 */
export type UpdateTableRequestDto = Partial<Pick<TableUpdate, "name" | "capacity" | "table_type">>;

/**
 * Single table item for bulk create
 */
export type BulkTableItem = Omit<TableInsert, "id" | "event_id">;

/**
 * Request DTO for bulk table creation
 */
export interface BulkCreateTablesRequestDto {
  tables: BulkTableItem[];
}

/**
 * Created table summary for bulk response
 */
export interface CreatedTableSummary {
  id: number;
  name: string;
  capacity: number;
  table_type: string;
}

/**
 * Response DTO for bulk table creation
 */
export interface BulkCreateTablesResponseDto {
  created: number;
  tables: CreatedTableSummary[];
}

/**
 * Response DTO for table list
 */
export interface ListTablesResponseDto {
  data: TableWithOccupancyDto[];
}

/**
 * Query parameters for listing tables
 */
export interface ListTablesQueryDto {
  sort?: "name" | "capacity";
  order?: "asc" | "desc";
}

// ============================================================================
// Seating Assignment DTOs
// ============================================================================

/**
 * Base Seating Assignment DTO - matches database entity
 */
export type SeatingAssignmentDto = SeatingAssignmentEntity;

/**
 * Guest info for assignment responses
 */
export interface AssignmentGuestInfo {
  id: number;
  name: string;
}

/**
 * Table info for assignment responses
 */
export interface AssignmentTableInfo {
  id: number;
  name: string;
}

/**
 * Extended Seating Assignment DTO with guest and table details
 */
export interface SeatingAssignmentWithDetailsDto {
  id: number;
  event_id: number;
  guest: AssignmentGuestInfo;
  table: AssignmentTableInfo;
  seat_position?: number | null;
}

/**
 * Request DTO for creating a seating assignment
 */
export type CreateAssignmentRequestDto = Omit<SeatingAssignmentInsert, "id">;

/**
 * Optimization impact info for assignment updates
 */
export interface OptimizationImpact {
  score_change: number;
  conflicts: ConflictInfo[];
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  type: string;
  guest1_id: number;
  guest1_name: string;
  guest2_id: number;
  guest2_name: string;
  severity: "low" | "medium" | "high";
  message: string;
}

/**
 * Request DTO for updating a seating assignment
 */
export interface UpdateAssignmentRequestDto {
  table_id?: number;
  seat_position?: number | null;
}

/**
 * Response DTO for updating a seating assignment (with impact)
 */
export interface UpdateAssignmentResponseDto extends SeatingAssignmentDto {
  optimization_impact?: OptimizationImpact;
}

/**
 * Single assignment item for bulk update
 */
export interface BulkAssignmentItem {
  guest_id: number;
  table_id: number;
  seat_position?: number | null;
}

/**
 * Request DTO for bulk assignment update
 */
export interface BulkUpdateAssignmentsRequestDto {
  assignments: BulkAssignmentItem[];
}

/**
 * Response DTO for bulk assignment update
 */
export interface BulkUpdateAssignmentsResponseDto {
  updated: number;
  optimization_impact: {
    overall_score: number;
    conflicts: ConflictInfo[];
  };
}

/**
 * Response DTO for assignment list
 */
export interface ListAssignmentsResponseDto {
  data: SeatingAssignmentWithDetailsDto[];
}

/**
 * Query parameters for listing assignments
 */
export interface ListAssignmentsQueryDto {
  table_id?: number;
  guest_id?: number;
}

/**
 * Response DTO for clearing all assignments
 */
export interface ClearAssignmentsResponseDto {
  deleted: number;
  message: string;
}

// ============================================================================
// Seating Plan Generation DTOs (AI-Powered)
// ============================================================================

/**
 * Optimization factors for seating plan generation
 */
export interface OptimizationFactors {
  relationships_weight?: number; // 0-10, default: 8
  age_compatibility_weight?: number; // 0-10, default: 5
  drinking_habits_weight?: number; // 0-10, default: 3
  hobbies_weight?: number; // 0-10, default: 6
  dietary_restrictions_weight?: number; // 0-10, default: 4
}

/**
 * Constraints for seating plan generation
 */
export interface SeatingConstraints {
  must_seat_together?: number[][]; // Array of guest ID arrays
  must_separate?: number[][]; // Array of guest ID arrays
}

/**
 * Request DTO for generating a seating plan
 */
export interface GenerateSeatingPlanRequestDto {
  optimization_factors?: OptimizationFactors;
  preserve_assignments?: number[]; // Guest IDs to keep in current positions
  constraints?: SeatingConstraints;
}

/**
 * Alternative table option for a guest
 */
export interface AlternativeTable {
  table_id: number;
  table_name: string;
  score: number;
}

/**
 * Assignment with compatibility info
 */
export interface AssignmentWithCompatibility {
  guest_id: number;
  guest_name: string;
  table_id: number;
  table_name: string;
  compatibility_score: number;
  alternative_tables?: AlternativeTable[];
}

/**
 * Statistics for generated seating plan
 */
export interface SeatingPlanStatistics {
  total_guests: number;
  assigned: number;
  unassigned: number;
  tables_used: number;
  average_table_compatibility: number;
}

/**
 * Response DTO for seating plan generation
 */
export interface GenerateSeatingPlanResponseDto {
  plan_id: string;
  status: "completed" | "partial" | "failed";
  optimization_score: number;
  assignments: AssignmentWithCompatibility[];
  statistics: SeatingPlanStatistics;
  warnings?: string[];
}

/**
 * Response DTO for retrieving a seating plan
 */
export interface GetSeatingPlanResponseDto {
  plan_id: string;
  event_id: number;
  created_at: string;
  optimization_score: number;
  assignments: AssignmentWithCompatibility[];
  statistics: SeatingPlanStatistics;
}

/**
 * Change item for validation
 */
export interface AssignmentChange {
  guest_id: number;
  from_table_id: number;
  to_table_id: number;
}

/**
 * Request DTO for validating assignment impact
 */
export interface ValidateAssignmentImpactRequestDto {
  changes: AssignmentChange[];
}

/**
 * Overall impact of proposed changes
 */
export interface OverallImpact {
  current_score: number;
  projected_score: number;
  score_change: number;
}

/**
 * Response DTO for assignment impact validation
 */
export interface ValidateAssignmentImpactResponseDto {
  overall_impact: OverallImpact;
  conflicts: ConflictInfo[];
  improvements: string[];
  recommendations: string[];
}

// ============================================================================
// Template DTOs
// ============================================================================

/**
 * Request DTO for saving an event as a template
 */
export interface SaveTemplateRequestDto {
  template_name: string;
  description?: string;
  include_guests?: boolean;
  include_assignments?: boolean;
}

/**
 * Template summary info
 */
export interface TemplateSummaryDto {
  template_id: string;
  name: string;
  description?: string;
  table_count?: number;
  guest_count?: number;
  created_at: string;
}

/**
 * Response DTO for saving a template
 */
export interface SaveTemplateResponseDto {
  template_id: string;
  name: string;
  description?: string;
  created_at: string;
}

/**
 * Response DTO for listing templates
 */
export type ListTemplatesResponseDto = PaginatedResponse<TemplateSummaryDto>;

/**
 * Query parameters for listing templates
 */
export interface ListTemplatesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================================
// Export DTOs
// ============================================================================

/**
 * Query parameters for exporting seating plan
 */
export interface ExportSeatingPlanQueryDto {
  format: "pdf" | "csv" | "json";
  include_guest_details?: boolean;
}

// ============================================================================
// Command Models (for operations/actions)
// ============================================================================

/**
 * Command to create a new event
 */
export interface CreateEventCommand {
  user_id: string;
  name: string;
  date: string;
}

/**
 * Command to update an event
 */
export interface UpdateEventCommand {
  id: number;
  user_id: string;
  name?: string;
  date?: string;
}

/**
 * Command to delete an event
 */
export interface DeleteEventCommand {
  id: number;
  user_id: string;
}

/**
 * Command to create a guest
 */
export interface CreateGuestCommand extends Omit<GuestInsert, "id"> {
  // Includes event_id from the entity
}

/**
 * Command to update a guest
 */
export interface UpdateGuestCommand {
  id: number;
  user_id: string; // For authorization
  name?: string;
  age_range?: string | null;
  drinking_habits?: string | null;
  dietary_restrictions?: string | null;
  hobbies_interests?: string | null;
  topics_to_avoid?: string | null;
}

/**
 * Command to delete a guest
 */
export interface DeleteGuestCommand {
  id: number;
  user_id: string;
}

/**
 * Command to create a relationship
 */
export interface CreateRelationshipCommand extends Omit<GuestRelationshipInsert, "id"> {
  user_id: string; // For authorization
}

/**
 * Command to update a relationship
 */
export interface UpdateRelationshipCommand {
  id: number;
  user_id: string;
  relationship_type?: string;
  strength?: number | null;
}

/**
 * Command to delete a relationship
 */
export interface DeleteRelationshipCommand {
  id: number;
  user_id: string;
}

/**
 * Command to create a table
 */
export interface CreateTableCommand extends Omit<TableInsert, "id"> {
  // Includes event_id from the entity
}

/**
 * Command to update a table
 */
export interface UpdateTableCommand {
  id: number;
  user_id: string;
  name?: string;
  capacity?: number;
  table_type?: string;
}

/**
 * Command to delete a table
 */
export interface DeleteTableCommand {
  id: number;
  user_id: string;
}

/**
 * Command to create a seating assignment
 */
export interface CreateAssignmentCommand extends Omit<SeatingAssignmentInsert, "id"> {
  user_id: string; // For authorization
}

/**
 * Command to update a seating assignment
 */
export interface UpdateAssignmentCommand {
  id: number;
  user_id: string;
  table_id?: number;
  seat_position?: number | null;
}

/**
 * Command to delete a seating assignment
 */
export interface DeleteAssignmentCommand {
  id: number;
  user_id: string;
}

/**
 * Command to clear all assignments for an event
 */
export interface ClearAssignmentsCommand {
  event_id: number;
  user_id: string;
}

/**
 * Command to generate a seating plan
 */
export interface GenerateSeatingPlanCommand {
  event_id: number;
  user_id: string;
  optimization_factors?: OptimizationFactors;
  preserve_assignments?: number[];
  constraints?: SeatingConstraints;
}

/**
 * Command to validate assignment impact
 */
export interface ValidateAssignmentImpactCommand {
  event_id: number;
  user_id: string;
  changes: AssignmentChange[];
}

/**
 * Command to save a template
 */
export interface SaveTemplateCommand {
  event_id: number;
  user_id: string;
  template_name: string;
  description?: string;
  include_guests?: boolean;
  include_assignments?: boolean;
}

/**
 * Command to export seating plan
 */
export interface ExportSeatingPlanCommand {
  event_id: number;
  user_id: string;
  format: "pdf" | "csv" | "json";
  include_guest_details?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an error response is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "error" in error && "message" in error;
}

/**
 * Type guard to check if validation details are present
 */
export function hasValidationDetails(error: ApiError): error is ApiError & { details: ValidationErrorDetail[] } {
  return Array.isArray(error.details);
}
