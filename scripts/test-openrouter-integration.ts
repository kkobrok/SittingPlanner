/* eslint-disable no-console */
/**
 * Integration test for OpenRouterService
 *
 * Tests end-to-end seating plan generation with a real API call.
 * Requires valid OPENROUTER_API_KEY in .env file.
 *
 * Usage:
 *   npm run test:openrouter
 *
 * Or manually:
 *   npx tsx scripts/test-openrouter-integration.ts
 */

import { OpenRouterService } from "../src/services/openrouter.service";

// Test data - small event for testing
const testGuests = [
  {
    id: 1,
    name: "Alice Smith",
    age_range: "25-35",
    drinking_habits: "Social",
    hobbies_interests: "Reading, Photography",
    dietary_restrictions: "Vegetarian",
    topics_to_avoid: "None",
  },
  {
    id: 2,
    name: "Bob Johnson",
    age_range: "35-45",
    drinking_habits: "Moderate",
    hobbies_interests: "Sports, Music",
    dietary_restrictions: "None",
    topics_to_avoid: "Politics",
  },
  {
    id: 3,
    name: "Carol Williams",
    age_range: "25-35",
    drinking_habits: "Light",
    hobbies_interests: "Reading, Cooking",
    dietary_restrictions: "Gluten-free",
    topics_to_avoid: "None",
  },
  {
    id: 4,
    name: "David Brown",
    age_range: "45-55",
    drinking_habits: "None",
    hobbies_interests: "Golf, Technology",
    dietary_restrictions: "None",
    topics_to_avoid: "Religion",
  },
];

const testTables = [
  { id: 1, name: "Table 1", capacity: 2 },
  { id: 2, name: "Table 2", capacity: 2 },
];

const testRelationships = [
  {
    guest1_id: 1,
    guest2_id: 3,
    relationship_type: "friend",
    strength: 8,
  },
  {
    guest1_id: 2,
    guest2_id: 4,
    relationship_type: "colleague",
    strength: 6,
  },
];

const testRequest = {
  optimization_factors: {
    relationships_weight: 8,
    age_compatibility_weight: 5,
    drinking_habits_weight: 3,
    hobbies_weight: 6,
    dietary_restrictions_weight: 4,
  },
};

async function runIntegrationTest() {
  console.log("=".repeat(70));
  console.log("OpenRouter Service Integration Test");
  console.log("=".repeat(70));
  console.log();

  try {
    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "###") {
      console.error("❌ OPENROUTER_API_KEY not configured in .env file");
      console.log("\nPlease add your OpenRouter API key to .env:");
      console.log("OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here");
      process.exit(1);
    }

    console.log("✓ API key configured");

    // Initialize service
    console.log("✓ Initializing OpenRouterService...");
    const service = new OpenRouterService();

    if (!service.isConfigured()) {
      throw new Error("Service not properly configured");
    }
    console.log("✓ Service initialized successfully");

    // Build prompt (simulating what SeatingPlanService does)
    console.log("\n" + "-".repeat(70));
    console.log("Building AI prompt...");
    console.log("-".repeat(70));

    const factors = testRequest.optimization_factors;
    const prompt = `You are optimizing seating arrangements for an event.

**Event Data:**

**Guests (${testGuests.length} total):**
${testGuests
  .map(
    (g) => `- ID ${g.id}: ${g.name}
  Age Range: ${g.age_range}
  Drinking Habits: ${g.drinking_habits}
  Hobbies/Interests: ${g.hobbies_interests}
  Dietary Restrictions: ${g.dietary_restrictions}
  Topics to Avoid: ${g.topics_to_avoid}`
  )
  .join("\n")}

**Tables (${testTables.length} total, ${testTables.reduce((sum, t) => sum + t.capacity, 0)} seats):**
${testTables.map((t) => `- Table ${t.id} (${t.name}): Capacity ${t.capacity}`).join("\n")}

**Guest Relationships:**
${testRelationships
  .map((r) => `- Guest ${r.guest1_id} ↔ Guest ${r.guest2_id}: ${r.relationship_type} (strength: ${r.strength}/10)`)
  .join("\n")}

**Optimization Weights (0-10 scale):**
- Relationships: ${factors.relationships_weight}/10
- Age Compatibility: ${factors.age_compatibility_weight}/10
- Drinking Habits: ${factors.drinking_habits_weight}/10
- Hobbies/Interests: ${factors.hobbies_weight}/10
- Dietary Restrictions: ${factors.dietary_restrictions_weight}/10

**Task:**
Create an optimal seating arrangement that:
1. Maximizes guest satisfaction and compatibility
2. Respects table capacity constraints
3. Follows the specified optimization weights

**Response Format (JSON only, no markdown):**
{
  "assignments": [
    {"guest_id": 1, "table_id": 1, "compatibility_score": 8.5}
  ],
  "overall_score": 87.5,
  "warnings": ["Any warnings or notes"]
}

Provide ONLY the JSON response, no additional text.`;

    console.log("✓ Prompt built successfully");
    console.log(`  - ${testGuests.length} guests`);
    console.log(`  - ${testTables.length} tables`);
    console.log(`  - ${testRelationships.length} relationships`);

    // Call OpenRouter API
    console.log("\n" + "-".repeat(70));
    console.log("Calling OpenRouter API...");
    console.log("-".repeat(70));
    console.log("Model: anthropic/claude-3.5-sonnet");
    console.log("Temperature: 0.2");
    console.log("Max Tokens: 4000");
    console.log();

    const startTime = Date.now();
    const aiResponse = await service.generateSeatingPlan(prompt);
    const elapsed = Date.now() - startTime;

    console.log(`✓ API call completed in ${elapsed}ms`);

    // Parse response
    console.log("\n" + "-".repeat(70));
    console.log("Parsing AI response...");
    console.log("-".repeat(70));

    const parsed = service.parseAIResponse(aiResponse) as {
      assignments: { guest_id: number; table_id: number; compatibility_score: number }[];
      overall_score: number;
      warnings?: string[];
    };

    console.log("✓ Response parsed successfully");

    // Validate results
    console.log("\n" + "-".repeat(70));
    console.log("Validation Results");
    console.log("-".repeat(70));

    const validationIssues: string[] = [];

    // Check all guests assigned
    const assignedGuestIds = new Set(parsed.assignments.map((a) => a.guest_id));
    const allGuestsAssigned = testGuests.every((g) => assignedGuestIds.has(g.id));

    if (allGuestsAssigned) {
      console.log("✓ All guests assigned");
    } else {
      const unassigned = testGuests.filter((g) => !assignedGuestIds.has(g.id)).map((g) => g.name);
      validationIssues.push(`Unassigned guests: ${unassigned.join(", ")}`);
      console.log(`✗ Missing assignments for: ${unassigned.join(", ")}`);
    }

    // Check table capacity
    const tableAssignments = new Map<number, number>();
    parsed.assignments.forEach((a) => {
      tableAssignments.set(a.table_id, (tableAssignments.get(a.table_id) || 0) + 1);
    });

    let capacityViolations = 0;
    tableAssignments.forEach((count, tableId) => {
      const table = testTables.find((t) => t.id === tableId);
      if (table && count > table.capacity) {
        capacityViolations++;
        validationIssues.push(`Table ${tableId} over capacity: ${count}/${table.capacity}`);
        console.log(`✗ Table ${tableId} (${table.name}) over capacity: ${count}/${table.capacity}`);
      }
    });

    if (capacityViolations === 0) {
      console.log("✓ All table capacities respected");
    }

    // Check compatibility scores
    const scores = parsed.assignments.map((a) => a.compatibility_score);
    const allScoresValid = scores.every((s) => s >= 0 && s <= 10);

    if (allScoresValid) {
      console.log("✓ All compatibility scores in valid range (0-10)");
    } else {
      validationIssues.push("Invalid compatibility scores detected");
      console.log("✗ Invalid compatibility scores detected");
    }

    // Display results
    console.log("\n" + "-".repeat(70));
    console.log("Seating Plan Results");
    console.log("-".repeat(70));
    console.log(`Overall Score: ${parsed.overall_score}/100`);
    console.log();

    testTables.forEach((table) => {
      const tableGuests = parsed.assignments
        .filter((a) => a.table_id === table.id)
        .map((a) => {
          const guest = testGuests.find((g) => g.id === a.guest_id);
          return guest ? `${guest.name} (score: ${a.compatibility_score})` : `Guest ${a.guest_id}`;
        });

      console.log(`${table.name} (${tableGuests.length}/${table.capacity} seats):`);
      tableGuests.forEach((g) => console.log(`  - ${g}`));
      console.log();
    });

    if (parsed.warnings && parsed.warnings.length > 0) {
      console.log("Warnings:");
      parsed.warnings.forEach((w) => console.log(`  - ${w}`));
      console.log();
    }

    // Final status
    console.log("=".repeat(70));
    if (validationIssues.length === 0) {
      console.log("✅ Integration test PASSED - All validations successful!");
    } else {
      console.log("⚠️  Integration test completed with issues:");
      validationIssues.forEach((issue) => console.log(`  - ${issue}`));
    }
    console.log("=".repeat(70));

    return validationIssues.length === 0 ? 0 : 1;
  } catch (error) {
    console.error("\n" + "=".repeat(70));
    console.error("❌ Integration test FAILED");
    console.error("=".repeat(70));

    if (error instanceof Error) {
      console.error("\nError:", error.message);

      if (error.message.includes("API key")) {
        console.error("\nPlease check your OPENROUTER_API_KEY configuration.");
      } else if (error.message.includes("Rate limit")) {
        console.error("\nRate limit exceeded. Please wait and try again.");
      } else if (error.message.includes("parse")) {
        console.error("\nFailed to parse AI response. The model may have returned unexpected format.");
      }
    } else {
      console.error("\nUnexpected error:", error);
    }

    return 1;
  }
}

// Run the test
if (require.main === module) {
  runIntegrationTest().then((exitCode) => process.exit(exitCode));
}

export { runIntegrationTest };
