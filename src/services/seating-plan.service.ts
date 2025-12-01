/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  GenerateSeatingPlanRequestDto,
  GenerateSeatingPlanResponseDto,
  ValidateAssignmentImpactRequestDto,
  ValidateAssignmentImpactResponseDto,
  AssignmentWithCompatibility,
  SeatingPlanStatistics,
  ConflictInfo,
} from "../types";
import { OpenRouterService } from "./openrouter.service";

/**
 * Service for AI-powered seating plan generation and validation
 */
export class SeatingPlanService {
  private openRouter: OpenRouterService;

  constructor(private supabase: SupabaseClient<Database>) {
    this.openRouter = new OpenRouterService();
  }

  /**
   * Generate an optimized seating plan using AI
   */
  async generateSeatingPlan(
    eventId: number,
    userId: string,
    request: GenerateSeatingPlanRequestDto
  ): Promise<GenerateSeatingPlanResponseDto> {
    // 1. Verify event belongs to user
    const { data: event, error: eventError } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (eventError || !event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // 2. If AI not configured, build a simple deterministic fallback plan after data load
    const aiConfigured = this.openRouter.isConfigured();

    // 3. Fetch all guests for the event
    const { data: guests, error: guestsError } = await this.supabase.from("guests").select("*").eq("event_id", eventId);

    if (guestsError) {
      throw new Error(`Failed to fetch guests: ${guestsError.message}`);
    }

    if (!guests || guests.length === 0) {
      throw new Error("NO_GUESTS_FOUND");
    }

    // 4. Fetch all tables for the event
    const { data: tables, error: tablesError } = await this.supabase.from("tables").select("*").eq("event_id", eventId);

    if (tablesError) {
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }

    if (!tables || tables.length === 0) {
      throw new Error("NO_TABLES_FOUND");
    }

    // 5. Check total capacity
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
    if (totalCapacity < guests.length) {
      throw new Error("INSUFFICIENT_TABLE_CAPACITY");
    }

    // 6. Fetch guest relationships (used for AI weighting; optional for fallback)
    const guestIds = guests.map((g) => g.id);
    const { data: relationships } = await this.supabase
      .from("guest_relationships")
      .select("*")
      .or(`guest1_id.in.(${guestIds.join(",")}),guest2_id.in.(${guestIds.join(",")})`);
    let parsedResponse: {
      assignments: { guest_id: number; table_id: number; compatibility_score: number }[];
      overall_score: number;
      warnings?: string[];
    };

    if (!aiConfigured) {
      // Fallback: round-robin guest assignment by table capacity
      const assignmentsFallback: { guest_id: number; table_id: number; compatibility_score: number }[] = [];
      const tableCapMap = new Map<number, { capacity: number; used: number }>();
      tables.forEach((t) => tableCapMap.set(t.id, { capacity: t.capacity, used: 0 }));
      let tableIndex = 0;
      for (const guest of guests) {
        // Advance to next table with space
        let attempts = 0;
        while (attempts < tables.length) {
          const t = tables[tableIndex];
          const info = tableCapMap.get(t.id)!;
          if (info.used < info.capacity) {
            info.used++;
            assignmentsFallback.push({ guest_id: guest.id, table_id: t.id, compatibility_score: 5 });
            tableIndex = (tableIndex + 1) % tables.length;
            break;
          }
          tableIndex = (tableIndex + 1) % tables.length;
          attempts++;
        }
      }
      parsedResponse = {
        assignments: assignmentsFallback,
        overall_score: 50,
        warnings: ["AI key missing: generated deterministic fallback plan."],
      };
    } else {
      // Build AI prompt and invoke AI
      const prompt = this.buildSeatingPrompt(guests, tables, relationships || [], request);
      const aiResponse = await this.openRouter.generateSeatingPlan(prompt);
      parsedResponse = this.openRouter.parseAIResponse(aiResponse) as {
        assignments: { guest_id: number; table_id: number; compatibility_score: number }[];
        overall_score: number;
        warnings?: string[];
      };
    }

    // 7/8. Validate and save assignments
    const planId = crypto.randomUUID();
    const assignments: AssignmentWithCompatibility[] = [];

    for (const assignment of parsedResponse.assignments) {
      const guest = guests.find((g) => g.id === assignment.guest_id);
      const table = tables.find((t) => t.id === assignment.table_id);

      if (!guest || !table) {
        continue;
      }

      // Delete existing assignment if any
      await this.supabase
        .from("seating_assignments")
        .delete()
        .eq("event_id", eventId)
        .eq("guest_id", assignment.guest_id);

      // Create new assignment
      await this.supabase.from("seating_assignments").insert({
        event_id: eventId,
        guest_id: assignment.guest_id,
        table_id: assignment.table_id,
      });

      assignments.push({
        guest_id: guest.id,
        guest_name: guest.name,
        table_id: table.id,
        table_name: table.name,
        compatibility_score: assignment.compatibility_score,
        alternative_tables: [], // TODO: Calculate alternatives
      });
    }

    // 9. Calculate statistics
    const statistics: SeatingPlanStatistics = {
      total_guests: guests.length,
      assigned: assignments.length,
      unassigned: guests.length - assignments.length,
      tables_used: new Set(assignments.map((a) => a.table_id)).size,
      average_table_compatibility: assignments.reduce((sum, a) => sum + a.compatibility_score, 0) / assignments.length,
    };

    return {
      plan_id: planId,
      status: "completed",
      optimization_score: parsedResponse.overall_score,
      assignments,
      statistics,
      warnings: parsedResponse.warnings,
    };
  }

  /**
   * Build the AI prompt for seating optimization
   */
  private buildSeatingPrompt(
    guests: any[],
    tables: any[],
    relationships: any[],
    request: GenerateSeatingPlanRequestDto
  ): string {
    const factors = request.optimization_factors || {};

    // Anonymize guest names for privacy - only send guest attributes to AI
    const anonymizedGuests = guests.map((g, index) => ({
      ...g,
      name: `Guest-${String(index + 1).padStart(3, "0")}`,
    }));

    return `You are optimizing seating arrangements for an event.

**Event Data:**

**Guests (${anonymizedGuests.length} total):**
${anonymizedGuests
  .map(
    (g) => `- ID ${g.id}: ${g.name}
  Age Range: ${g.age_range || "Unknown"}
  Drinking Habits: ${g.drinking_habits || "Unknown"}
  Hobbies/Interests: ${g.hobbies_interests || "None specified"}
  Dietary Restrictions: ${g.dietary_restrictions || "None"}
  Topics to Avoid: ${g.topics_to_avoid || "None"}`
  )
  .join("\n")}

**Tables (${tables.length} total, ${tables.reduce((sum, t) => sum + t.capacity, 0)} seats):**
${tables.map((t) => `- Table ${t.id} (${t.name}): Capacity ${t.capacity}`).join("\n")}

**Guest Relationships:**
${
  relationships.length > 0
    ? relationships
        .map(
          (r) =>
            `- Guest ${r.guest1_id} ↔ Guest ${r.guest2_id}: ${r.relationship_type} (strength: ${r.strength || "N/A"}/10)`
        )
        .join("\n")
    : "No relationships defined"
}

**Optimization Weights (0-10 scale):**
- Relationships: ${factors.relationships_weight ?? 8}/10
- Age Compatibility: ${factors.age_compatibility_weight ?? 5}/10
- Drinking Habits: ${factors.drinking_habits_weight ?? 3}/10
- Hobbies/Interests: ${factors.hobbies_weight ?? 6}/10
- Dietary Restrictions: ${factors.dietary_restrictions_weight ?? 4}/10

${request.constraints?.must_seat_together ? `**Must Seat Together:**\n${request.constraints.must_seat_together.map((group) => `- Guests: ${group.join(", ")}`).join("\n")}` : ""}

${request.constraints?.must_separate ? `**Must Keep Separate:**\n${request.constraints.must_separate.map((group) => `- Guests: ${group.join(", ")}`).join("\n")}` : ""}

**Task:**
Create an optimal seating arrangement that:
1. Maximizes guest satisfaction and compatibility
2. Respects table capacity constraints
3. Follows the specified optimization weights
4. Adheres to any must-seat-together or must-separate constraints

**Response Format (JSON only, no markdown):**
{
  "assignments": [
    {"guest_id": 1, "table_id": 1, "compatibility_score": 8.5}
  ],
  "overall_score": 87.5,
  "warnings": ["Any warnings or notes"]
}

Provide ONLY the JSON response, no additional text.`;
  }

  /**
   * Validate the impact of proposed assignment changes
   */
  async validateAssignmentImpact(
    eventId: number,
    userId: string,
    request: ValidateAssignmentImpactRequestDto
  ): Promise<ValidateAssignmentImpactResponseDto> {
    // Verify event belongs to user
    const { data: event, error: eventError } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", userId)
      .single();

    if (eventError || !event) {
      throw new Error("EVENT_NOT_FOUND");
    }

    // TODO: Implement actual validation logic
    // For now, return a mock response
    const conflicts: ConflictInfo[] = [];

    return {
      overall_impact: {
        current_score: 85.0,
        projected_score: 83.5,
        score_change: -1.5,
      },
      conflicts,
      improvements: [],
      recommendations: ["Consider the impact on table dynamics before making this change"],
    };
  }
}
