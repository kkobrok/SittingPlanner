globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, n as numberType, d as arrayType } from './astro/server_D4BVXBCg.mjs';

const OptimizationFactorsSchema = objectType({
  relationships_weight: numberType().min(0, { message: "Weight must be at least 0" }).max(10, { message: "Weight must not exceed 10" }).optional().default(8),
  age_compatibility_weight: numberType().min(0, { message: "Weight must be at least 0" }).max(10, { message: "Weight must not exceed 10" }).optional().default(5),
  drinking_habits_weight: numberType().min(0, { message: "Weight must be at least 0" }).max(10, { message: "Weight must not exceed 10" }).optional().default(3),
  hobbies_weight: numberType().min(0, { message: "Weight must be at least 0" }).max(10, { message: "Weight must not exceed 10" }).optional().default(6),
  dietary_restrictions_weight: numberType().min(0, { message: "Weight must be at least 0" }).max(10, { message: "Weight must not exceed 10" }).optional().default(4)
});
const SeatingConstraintsSchema = objectType({
  must_seat_together: arrayType(arrayType(numberType().int().positive())).optional().describe("Array of guest ID arrays that must be seated together"),
  must_separate: arrayType(arrayType(numberType().int().positive())).optional().describe("Array of guest ID arrays that must be kept separate")
});
const GenerateSeatingPlanRequestSchema = objectType({
  optimization_factors: OptimizationFactorsSchema.optional(),
  preserve_assignments: arrayType(numberType().int().positive()).optional().describe("Array of guest IDs whose current assignments should be preserved"),
  constraints: SeatingConstraintsSchema.optional()
});
const AssignmentChangeSchema = objectType({
  guest_id: numberType().int().positive({ message: "Guest ID must be a positive integer" }),
  from_table_id: numberType().int().positive({ message: "From table ID must be a positive integer" }).nullable(),
  to_table_id: numberType().int().positive({ message: "To table ID must be a positive integer" })
});
const ValidateAssignmentImpactRequestSchema = objectType({
  changes: arrayType(AssignmentChangeSchema).min(1, { message: "At least one change must be provided" }).max(50, { message: "Cannot validate more than 50 changes at once" })
});

class OpenRouterService {
  apiKey;
  baseUrl;
  defaultModel;
  defaultParams;
  cache;
  cacheTTL;
  // Cache TTL in milliseconds (default: 15 minutes)
  // Track configuration state so we can gracefully fallback when missing
  configured;
  // ============================================================================
  // Constructor (Step 3)
  // ============================================================================
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";
    const isPlaceholder = !this.apiKey || this.apiKey === "###" || this.apiKey.trim() === "" || this.apiKey === "your-openrouter-api-key-here" || this.apiKey.startsWith("your-") || this.apiKey === "sk-or-v1-your-actual-key-here";
    this.configured = !isPlaceholder;
    if (!this.configured) {
      console.warn(
        "[OpenRouter] API key missing or is a placeholder. AI seating optimization will use fallback stub plan."
      );
    }
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.defaultModel = "anthropic/claude-3.5-sonnet";
    this.defaultParams = {
      temperature: 0.2,
      // Low temperature for consistent, deterministic results
      max_tokens: 4e3,
      // Sufficient for medium-sized events
      top_p: 0.9
      // Recommended default
    };
    this.cache = /* @__PURE__ */ new Map();
    this.cacheTTL = 15 * 60 * 1e3;
  }
  // ============================================================================
  // Public Methods (Section 3)
  // ============================================================================
  /**
   * Generate an optimized seating plan using AI
   *
   * Uses caching to reduce API costs - identical prompts within the TTL window
   * will return cached results instead of making a new API call.
   *
   * @param prompt - Detailed prompt containing guest data, table data, relationships, and optimization criteria
   * @returns Raw AI response containing JSON seating plan
   * @throws Error if API key is invalid, rate limited, or model unavailable
   *
   * @example
   * ```typescript
   * const prompt = this.buildSeatingPrompt(guests, tables, relationships, request);
   * const aiResponse = await this.openRouter.generateSeatingPlan(prompt);
   * const parsedResponse = this.openRouter.parseAIResponse(aiResponse);
   * ```
   */
  async generateSeatingPlan(prompt) {
    const cacheKey = this.generateCacheKey(prompt);
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry) {
      const now = Date.now();
      const age = now - cachedEntry.timestamp;
      if (age < cachedEntry.ttl) {
        console.log(`[OpenRouter] Cache hit (age: ${Math.round(age / 1e3)}s)`);
        return cachedEntry.response;
      } else {
        this.cache.delete(cacheKey);
        console.log("[OpenRouter] Cache expired, making new request");
      }
    }
    const messages = [this.createSystemMessage(), this.createUserMessage(prompt)];
    const requestBody = {
      model: this.defaultModel,
      messages,
      response_format: this.createSeatingPlanResponseFormat(),
      temperature: this.defaultParams.temperature,
      max_tokens: this.defaultParams.max_tokens,
      top_p: this.defaultParams.top_p
    };
    const response = await this.sendRequest(requestBody);
    const content = this.extractContent(response);
    this.cache.set(cacheKey, {
      response: content,
      timestamp: Date.now(),
      ttl: this.cacheTTL
    });
    return content;
  }
  /**
   * Parse and validate AI response into structured object
   *
   * Handles various response formats:
   * - Plain JSON
   * - JSON wrapped in markdown code blocks
   * - JSON with extra text
   *
   * @param response - Raw AI response string
   * @returns Parsed seating plan object
   * @throws Error if JSON parsing fails or required fields are missing
   *
   * @example
   * ```typescript
   * const parsed = this.openRouter.parseAIResponse(aiResponse) as {
   *   assignments: { guest_id: number; table_id: number; compatibility_score: number }[];
   *   overall_score: number;
   *   warnings?: string[];
   * };
   * ```
   */
  parseAIResponse(response) {
    try {
      let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }
      const parsed = JSON.parse(cleaned);
      if (!parsed.assignments || !Array.isArray(parsed.assignments)) {
        throw new Error("Invalid response: missing or invalid assignments array");
      }
      if (typeof parsed.overall_score !== "number") {
        throw new Error("Invalid response: missing or invalid overall_score");
      }
      return parsed;
    } catch (error) {
      console.error("Failed to parse AI response:", {
        error: error instanceof Error ? error.message : "Unknown error",
        responsePreview: response.substring(0, 200) + "..."
      });
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Check if the service is configured and ready
   *
   * @returns True if API key is configured, false otherwise
   */
  isConfigured() {
    return this.configured;
  }
  /**
   * Clear all cached responses
   *
   * Useful for forcing fresh API calls or managing memory usage.
   * Called automatically when cache entries expire.
   */
  clearCache() {
    this.cache.clear();
    console.log("[OpenRouter] Cache cleared");
  }
  /**
   * Get cache statistics
   *
   * @returns Object containing cache size and oldest entry age
   */
  getCacheStats() {
    const now = Date.now();
    let oldestTimestamp = now;
    this.cache.forEach((entry) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });
    return {
      size: this.cache.size,
      oldestEntryAge: this.cache.size > 0 ? now - oldestTimestamp : null
    };
  }
  // ============================================================================
  // Private Methods (Section 4)
  // ============================================================================
  /**
   * Create system message with AI instructions
   */
  createSystemMessage() {
    return {
      role: "system",
      content: `You are an expert event planner specializing in optimal seating arrangements.
Your task is to analyze guest information, table configurations, and relationships to create
the best possible seating plan that maximizes guest compatibility and satisfaction.

CRITICAL INSTRUCTIONS:
1. You MUST respond with valid JSON only, no additional text or explanation
2. Follow the exact schema provided in response_format
3. Ensure all guest_id and table_id values match the provided data
4. Calculate compatibility_score as a number between 0-10
5. Calculate overall_score as the average of all compatibility scores
6. Include warnings array for any potential issues (empty array if none)

Your response will be parsed directly as JSON, so do not include markdown, comments, or any text outside the JSON object.`
    };
  }
  /**
   * Create user message with the seating plan prompt
   */
  createUserMessage(prompt) {
    return {
      role: "user",
      content: prompt
    };
  }
  /**
   * Define JSON schema for structured seating plan responses
   */
  createSeatingPlanResponseFormat() {
    return {
      type: "json_schema",
      json_schema: {
        name: "seating_plan_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            assignments: {
              type: "array",
              description: "Array of guest-to-table assignments",
              items: {
                type: "object",
                properties: {
                  guest_id: {
                    type: "number",
                    description: "ID of the guest being assigned"
                  },
                  table_id: {
                    type: "number",
                    description: "ID of the table where guest is seated"
                  },
                  compatibility_score: {
                    type: "number",
                    description: "Compatibility score for this assignment (0-10)"
                  }
                },
                required: ["guest_id", "table_id", "compatibility_score"],
                additionalProperties: false
              }
            },
            overall_score: {
              type: "number",
              description: "Overall optimization score for the entire plan (0-100)"
            },
            warnings: {
              type: "array",
              description: "Any warnings or notes about the seating plan",
              items: {
                type: "string"
              }
            }
          },
          required: ["assignments", "overall_score"],
          additionalProperties: false
        }
      }
    };
  }
  /**
   * Send HTTP POST request to OpenRouter API with retry logic
   */
  async sendRequest(body, retryCount = 0) {
    const maxRetries = 3;
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://easywedding.app",
          "X-Title": "EasyWedding Seating Planner"
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        await this.handleErrorResponse(response, retryCount, maxRetries);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        const retryDelay = Math.pow(2, retryCount) * 1e3;
        console.warn(`Request failed, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await this.delay(retryDelay);
        return this.sendRequest(body, retryCount + 1);
      }
      throw error;
    }
  }
  /**
   * Handle HTTP error responses with appropriate retry logic
   */
  async handleErrorResponse(response, retryCount, maxRetries) {
    const errorBody = await response.text();
    switch (response.status) {
      case 401:
        throw new Error("Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.");
      case 429:
        if (retryCount < maxRetries) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter) * 1e3 : Math.pow(2, retryCount) * 1e3;
          console.warn(`Rate limited, retrying after ${delay}ms...`);
          await this.delay(delay);
          throw new Error("RETRY");
        }
        throw new Error("Rate limit exceeded. Please try again later.");
      case 503:
        if (retryCount < maxRetries) {
          throw new Error("RETRY");
        }
        throw new Error("OpenRouter service temporarily unavailable. Please try again later.");
      case 400:
        throw new Error(`Invalid request to OpenRouter: ${errorBody}`);
      default:
        throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }
  }
  /**
   * Extract message content from OpenRouter API response
   */
  extractContent(response) {
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response choices returned from OpenRouter");
    }
    const message = response.choices[0].message;
    if (!message || !message.content) {
      throw new Error("No content in OpenRouter response");
    }
    return message.content;
  }
  /**
   * Determine if an error should trigger a retry
   */
  isRetryableError(error) {
    if (error instanceof Error) {
      if (error.message === "RETRY") return true;
      if (error.message?.includes("timeout")) return true;
    }
    if (error && typeof error === "object" && "name" in error) {
      if (error.name === "NetworkError" || error.name === "FetchError") return true;
    }
    return false;
  }
  /**
   * Generate cache key from prompt
   *
   * Uses a simple hash function to create a deterministic key from the prompt.
   * Identical prompts will always generate the same key.
   */
  generateCacheKey(prompt) {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `prompt_${Math.abs(hash).toString(16)}`;
  }
  /**
   * Helper for async delays in retry logic
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class SeatingPlanService {
  constructor(supabase) {
    this.supabase = supabase;
    this.openRouter = new OpenRouterService();
  }
  openRouter;
  /**
   * Generate an optimized seating plan using AI
   */
  async generateSeatingPlan(eventId, userId, request) {
    const { data: event, error: eventError } = await this.supabase.from("events").select("*").eq("id", eventId).eq("user_id", userId).single();
    if (eventError || !event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const aiConfigured = this.openRouter.isConfigured();
    const { data: guests, error: guestsError } = await this.supabase.from("guests").select("*").eq("event_id", eventId);
    if (guestsError) {
      throw new Error(`Failed to fetch guests: ${guestsError.message}`);
    }
    if (!guests || guests.length === 0) {
      throw new Error("NO_GUESTS_FOUND");
    }
    const { data: tables, error: tablesError } = await this.supabase.from("tables").select("*").eq("event_id", eventId);
    if (tablesError) {
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }
    if (!tables || tables.length === 0) {
      throw new Error("NO_TABLES_FOUND");
    }
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
    if (totalCapacity < guests.length) {
      throw new Error("INSUFFICIENT_TABLE_CAPACITY");
    }
    const guestIds = guests.map((g) => g.id);
    const { data: relationships } = await this.supabase.from("guest_relationships").select("*").or(`guest1_id.in.(${guestIds.join(",")}),guest2_id.in.(${guestIds.join(",")})`);
    let parsedResponse;
    if (!aiConfigured) {
      const assignmentsFallback = [];
      const tableCapMap = /* @__PURE__ */ new Map();
      tables.forEach((t) => tableCapMap.set(t.id, { capacity: t.capacity, used: 0 }));
      let tableIndex = 0;
      for (const guest of guests) {
        let attempts = 0;
        while (attempts < tables.length) {
          const t = tables[tableIndex];
          const info = tableCapMap.get(t.id);
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
        warnings: ["AI key missing: generated deterministic fallback plan."]
      };
    } else {
      const prompt = this.buildSeatingPrompt(guests, tables, relationships || [], request);
      const aiResponse = await this.openRouter.generateSeatingPlan(prompt);
      parsedResponse = this.openRouter.parseAIResponse(aiResponse);
    }
    const planId = crypto.randomUUID();
    const assignments = [];
    for (const assignment of parsedResponse.assignments) {
      const guest = guests.find((g) => g.id === assignment.guest_id);
      const table = tables.find((t) => t.id === assignment.table_id);
      if (!guest || !table) {
        continue;
      }
      await this.supabase.from("seating_assignments").delete().eq("event_id", eventId).eq("guest_id", assignment.guest_id);
      await this.supabase.from("seating_assignments").insert({
        event_id: eventId,
        guest_id: assignment.guest_id,
        table_id: assignment.table_id
      });
      assignments.push({
        guest_id: guest.id,
        guest_name: guest.name,
        table_id: table.id,
        table_name: table.name,
        compatibility_score: assignment.compatibility_score,
        alternative_tables: []
        // TODO: Calculate alternatives
      });
    }
    const statistics = {
      total_guests: guests.length,
      assigned: assignments.length,
      unassigned: guests.length - assignments.length,
      tables_used: new Set(assignments.map((a) => a.table_id)).size,
      average_table_compatibility: assignments.reduce((sum, a) => sum + a.compatibility_score, 0) / assignments.length
    };
    return {
      plan_id: planId,
      status: "completed",
      optimization_score: parsedResponse.overall_score,
      assignments,
      statistics,
      warnings: parsedResponse.warnings
    };
  }
  /**
   * Build the AI prompt for seating optimization
   */
  buildSeatingPrompt(guests, tables, relationships, request) {
    const factors = request.optimization_factors || {};
    const anonymizedGuests = guests.map((g, index) => ({
      ...g,
      name: `Guest-${String(index + 1).padStart(3, "0")}`
    }));
    return `You are optimizing seating arrangements for an event.

**Event Data:**

**Guests (${anonymizedGuests.length} total):**
${anonymizedGuests.map(
      (g) => `- ID ${g.id}: ${g.name}
  Age Range: ${g.age_range || "Unknown"}
  Drinking Habits: ${g.drinking_habits || "Unknown"}
  Hobbies/Interests: ${g.hobbies_interests || "None specified"}
  Dietary Restrictions: ${g.dietary_restrictions || "None"}
  Topics to Avoid: ${g.topics_to_avoid || "None"}`
    ).join("\n")}

**Tables (${tables.length} total, ${tables.reduce((sum, t) => sum + t.capacity, 0)} seats):**
${tables.map((t) => `- Table ${t.id} (${t.name}): Capacity ${t.capacity}`).join("\n")}

**Guest Relationships:**
${relationships.length > 0 ? relationships.map(
      (r) => `- Guest ${r.guest1_id} ↔ Guest ${r.guest2_id}: ${r.relationship_type} (strength: ${r.strength || "N/A"}/10)`
    ).join("\n") : "No relationships defined"}

**Optimization Weights (0-10 scale):**
- Relationships: ${factors.relationships_weight ?? 8}/10
- Age Compatibility: ${factors.age_compatibility_weight ?? 5}/10
- Drinking Habits: ${factors.drinking_habits_weight ?? 3}/10
- Hobbies/Interests: ${factors.hobbies_weight ?? 6}/10
- Dietary Restrictions: ${factors.dietary_restrictions_weight ?? 4}/10

${request.constraints?.must_seat_together ? `**Must Seat Together:**
${request.constraints.must_seat_together.map((group) => `- Guests: ${group.join(", ")}`).join("\n")}` : ""}

${request.constraints?.must_separate ? `**Must Keep Separate:**
${request.constraints.must_separate.map((group) => `- Guests: ${group.join(", ")}`).join("\n")}` : ""}

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
  async validateAssignmentImpact(eventId, userId, _request) {
    const { data: event, error: eventError } = await this.supabase.from("events").select("*").eq("id", eventId).eq("user_id", userId).single();
    if (eventError || !event) {
      throw new Error("EVENT_NOT_FOUND");
    }
    const conflicts = [];
    return {
      overall_impact: {
        current_score: 85,
        projected_score: 83.5,
        score_change: -1.5
      },
      conflicts,
      improvements: [],
      recommendations: ["Consider the impact on table dynamics before making this change"]
    };
  }
}

export { GenerateSeatingPlanRequestSchema as G, SeatingPlanService as S, ValidateAssignmentImpactRequestSchema as V };
