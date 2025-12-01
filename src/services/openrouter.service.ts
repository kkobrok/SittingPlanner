/* eslint-disable no-console */
/**
 * OpenRouter AI Service
 *
 * Integrates with OpenRouter.ai API for AI-powered seating optimization.
 * Implements structured JSON responses, retry logic, and comprehensive error handling.
 *
 * Security Features:
 * - API key stored in environment variables only, never in code
 * - API key never exposed in logs or error messages
 * - Strict JSON schema validation (strict: true) to prevent injection attacks
 * - Input sanitization via response format constraints
 * - Retry logic with exponential backoff to handle transient failures
 * - HTTPS-only communication with OpenRouter API
 *
 * @example
 * ```typescript
 * const service = new OpenRouterService();
 * const prompt = buildSeatingPrompt(guests, tables, relationships, request);
 * const aiResponse = await service.generateSeatingPlan(prompt);
 * const parsed = service.parseAIResponse(aiResponse);
 * ```
 */

// ============================================================================
// Type Definitions (Step 1)
// ============================================================================

/**
 * Message format for chat completion
 */
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Model configuration parameters
 */
interface ModelParameters {
  temperature: number; // 0.0-1.0, lower = more deterministic
  max_tokens: number; // Maximum response length
  top_p: number; // 0.0-1.0, nucleus sampling
}

/**
 * Response format configuration for structured JSON output
 */
interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
      additionalProperties: boolean;
    };
  };
}

/**
 * Complete request body for OpenRouter API
 */
interface RequestBody {
  model: string;
  messages: Message[];
  response_format: ResponseFormat;
  temperature: number;
  max_tokens: number;
  top_p: number;
}

/**
 * OpenRouter API response structure
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Cache entry with TTL for storing AI responses
 */
interface CacheEntry {
  response: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// ============================================================================
// Service Class (Step 2)
// ============================================================================

/**
 * Service for interacting with OpenRouter AI API
 *
 * Provides AI-powered seating plan generation with:
 * - Structured JSON responses via JSON Schema
 * - Automatic retry logic for transient failures
 * - Comprehensive error handling
 * - Security best practices
 * - Request caching to reduce API costs
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultParams: ModelParameters;
  private readonly cache: Map<string, CacheEntry>;
  private readonly cacheTTL: number; // Cache TTL in milliseconds (default: 15 minutes)
  // Track configuration state so we can gracefully fallback when missing
  private readonly configured: boolean;

  // ============================================================================
  // Constructor (Step 3)
  // ============================================================================

  constructor() {
    // Load API key (do not throw here; allow graceful fallback)
    this.apiKey = import.meta.env.OPENROUTER_API_KEY || "";

    // Check if API key is configured and not a placeholder
    const isPlaceholder =
      !this.apiKey ||
      this.apiKey === "###" ||
      this.apiKey.trim() === "" ||
      this.apiKey === "your-openrouter-api-key-here" ||
      this.apiKey.startsWith("your-") ||
      this.apiKey === "sk-or-v1-your-actual-key-here";

    this.configured = !isPlaceholder;

    if (!this.configured) {
      console.warn(
        "[OpenRouter] API key missing or is a placeholder. AI seating optimization will use fallback stub plan."
      );
    }

    // Initialize configuration
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.defaultModel = "anthropic/claude-3.5-sonnet";
    this.defaultParams = {
      temperature: 0.2, // Low temperature for consistent, deterministic results
      max_tokens: 4000, // Sufficient for medium-sized events
      top_p: 0.9, // Recommended default
    };

    // Initialize cache with 15-minute TTL
    this.cache = new Map<string, CacheEntry>();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes in milliseconds
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
  async generateSeatingPlan(prompt: string): Promise<string> {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt);
    const cachedEntry = this.cache.get(cacheKey);

    if (cachedEntry) {
      const now = Date.now();
      const age = now - cachedEntry.timestamp;

      // Return cached response if still valid
      if (age < cachedEntry.ttl) {
        console.log(`[OpenRouter] Cache hit (age: ${Math.round(age / 1000)}s)`);
        return cachedEntry.response;
      } else {
        // Cache expired, remove it
        this.cache.delete(cacheKey);
        console.log("[OpenRouter] Cache expired, making new request");
      }
    }

    // Cache miss or expired - make API call
    const messages = [this.createSystemMessage(), this.createUserMessage(prompt)];

    const requestBody: RequestBody = {
      model: this.defaultModel,
      messages,
      response_format: this.createSeatingPlanResponseFormat(),
      temperature: this.defaultParams.temperature,
      max_tokens: this.defaultParams.max_tokens,
      top_p: this.defaultParams.top_p,
    };

    const response = await this.sendRequest(requestBody);
    const content = this.extractContent(response);

    // Cache the response
    this.cache.set(cacheKey, {
      response: content,
      timestamp: Date.now(),
      ttl: this.cacheTTL,
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
  parseAIResponse(response: string): object {
    try {
      // Remove markdown code fences if present
      let cleaned = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Try to extract JSON object if there's extra text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      // Validate required fields
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
        responsePreview: response.substring(0, 200) + "...",
      });
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if the service is configured and ready
   *
   * @returns True if API key is configured, false otherwise
   */
  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Clear all cached responses
   *
   * Useful for forcing fresh API calls or managing memory usage.
   * Called automatically when cache entries expire.
   */
  clearCache(): void {
    this.cache.clear();
    console.log("[OpenRouter] Cache cleared");
  }

  /**
   * Get cache statistics
   *
   * @returns Object containing cache size and oldest entry age
   */
  getCacheStats(): { size: number; oldestEntryAge: number | null } {
    const now = Date.now();
    let oldestTimestamp = now;

    this.cache.forEach((entry) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    });

    return {
      size: this.cache.size,
      oldestEntryAge: this.cache.size > 0 ? now - oldestTimestamp : null,
    };
  }

  // ============================================================================
  // Private Methods (Section 4)
  // ============================================================================

  /**
   * Create system message with AI instructions
   */
  private createSystemMessage(): Message {
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

Your response will be parsed directly as JSON, so do not include markdown, comments, or any text outside the JSON object.`,
    };
  }

  /**
   * Create user message with the seating plan prompt
   */
  private createUserMessage(prompt: string): Message {
    return {
      role: "user",
      content: prompt,
    };
  }

  /**
   * Define JSON schema for structured seating plan responses
   */
  private createSeatingPlanResponseFormat(): ResponseFormat {
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
                    description: "ID of the guest being assigned",
                  },
                  table_id: {
                    type: "number",
                    description: "ID of the table where guest is seated",
                  },
                  compatibility_score: {
                    type: "number",
                    description: "Compatibility score for this assignment (0-10)",
                  },
                },
                required: ["guest_id", "table_id", "compatibility_score"],
                additionalProperties: false,
              },
            },
            overall_score: {
              type: "number",
              description: "Overall optimization score for the entire plan (0-100)",
            },
            warnings: {
              type: "array",
              description: "Any warnings or notes about the seating plan",
              items: {
                type: "string",
              },
            },
          },
          required: ["assignments", "overall_score"],
          additionalProperties: false,
        },
      },
    };
  }

  /**
   * Send HTTP POST request to OpenRouter API with retry logic
   */
  private async sendRequest(body: RequestBody, retryCount = 0): Promise<OpenRouterResponse> {
    const maxRetries = 3;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://easywedding.app",
          "X-Title": "EasyWedding Seating Planner",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, retryCount, maxRetries);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        const retryDelay = Math.pow(2, retryCount) * 1000;
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
  private async handleErrorResponse(response: Response, retryCount: number, maxRetries: number): Promise<never> {
    const errorBody = await response.text();

    switch (response.status) {
      case 401:
        throw new Error("Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.");

      case 429:
        if (retryCount < maxRetries) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
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
  private extractContent(response: OpenRouterResponse): string {
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
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      if (error.message === "RETRY") return true;
      if (error.message?.includes("timeout")) return true;
    }

    // Network errors
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
  private generateCacheKey(prompt: string): string {
    // Simple hash function for cache key generation
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `prompt_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Helper for async delays in retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
