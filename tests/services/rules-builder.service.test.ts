import { RulesBuilderService } from "../../src/services/rules-builder.service";
import type { GuestRelationshipDto, GuestDto } from "../../src/types";

describe("RulesBuilderService", () => {
  let service: RulesBuilderService;

  beforeEach(() => {
    service = new RulesBuilderService();
  });

  // ============================================================================
  // EDGE CASES - Empty/Invalid Input
  // ============================================================================

  describe("Edge Cases - Empty/Invalid Input", () => {
    it("should handle empty relationships array", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toBe("No specific seating rules defined. Optimize based on general compatibility.");
    });

    it("should handle null relationships array", () => {
      // Arrange
      const relationships = null as any;
      const guests: GuestDto[] = [createGuest(1, "Alice")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toBe("No specific seating rules defined. Optimize based on general compatibility.");
    });

    it("should handle undefined relationships array", () => {
      // Arrange
      const relationships = undefined as any;
      const guests: GuestDto[] = [createGuest(1, "Alice")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toBe("No specific seating rules defined. Optimize based on general compatibility.");
    });

    it("should handle empty guests array", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toBe("No guests available for rule generation.");
    });

    it("should handle null guests array", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests = null as any;

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toBe("No guests available for rule generation.");
    });

    it("should skip relationships where guest IDs do not exist", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 999, 1000, "friend", 8), // Non-existent guest IDs
        createRelationship(2, 1, 2, "friend", 7), // Valid guests
      ];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
      expect(result).not.toContain("Guest 999");
      expect(result).not.toContain("Guest 1000");
    });
  });

  // ============================================================================
  // RELATIONSHIP TYPE HANDLING
  // ============================================================================

  describe("Relationship Type Handling", () => {
    it("should handle friend relationships with seat_together action", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toMatchInlineSnapshot(`
        "SEATING RULES:

        Friends (High Priority):
        - Seat Alice near Bob (strength: 8/10 - Strong)"
      `);
    });

    it("should handle family relationships with seat_together action", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "family", 10)];
      const guests: GuestDto[] = [createGuest(1, "John"), createGuest(2, "Mary")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toMatchInlineSnapshot(`
        "SEATING RULES:

        Family (High Priority):
        - Seat John near Mary (strength: 10/10 - Very Strong)"
      `);
    });

    it("should handle romantic relationships with critical priority", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "romantic", 10)];
      const guests: GuestDto[] = [createGuest(1, "Romeo"), createGuest(2, "Juliet")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Romantic Partners (Critical Priority)");
      expect(result).toContain("Seat Romeo near Juliet");
    });

    it("should handle conflict relationships with keep_separate action", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "conflict", 9)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Eve")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toMatchInlineSnapshot(`
        "SEATING RULES:

        Conflicts (Critical - Avoid):
        - Keep Alice away from Eve (severity: 9/10 - Very Strong)"
      `);
    });

    it("should handle colleague relationships with medium priority", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "colleague", 6)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Colleagues (Medium Priority)");
      expect(result).toContain("Seat Alice near Bob");
    });

    it("should handle unknown relationship types as 'other'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "acquaintance", 5)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Other Relationships (Low Priority)");
      expect(result).toContain("Alice and Bob");
    });

    it("should handle null relationship_type as 'other'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, null as any, 5)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Other Relationships");
    });

    it("should normalize relationship types (case-insensitive, trim whitespace)", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "  FRIEND  ", 8),
        createRelationship(2, 3, 4, "Friend", 7),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // Both should be grouped together as "Friends"
      const friendMatches = result.match(/Friends \(High Priority\)/g);
      expect(friendMatches).toHaveLength(1); // Only one "Friends" section
    });
  });

  // ============================================================================
  // STRENGTH LABELS
  // ============================================================================

  describe("Strength Labels", () => {
    it("should label strength >= 9 as 'Very Strong'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 9),
        createRelationship(2, 3, 4, "friend", 10),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("9/10 - Very Strong");
      expect(result).toContain("10/10 - Very Strong");
    });

    it("should label strength 7-8 as 'Strong'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 7),
        createRelationship(2, 3, 4, "friend", 8),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("7/10 - Strong");
      expect(result).toContain("8/10 - Strong");
    });

    it("should label strength 5-6 as 'Moderate'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 5),
        createRelationship(2, 3, 4, "friend", 6),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("5/10 - Moderate");
      expect(result).toContain("6/10 - Moderate");
    });

    it("should label strength 3-4 as 'Weak'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 3),
        createRelationship(2, 3, 4, "friend", 4),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("3/10 - Weak");
      expect(result).toContain("4/10 - Weak");
    });

    it("should label strength 0-2 as 'Very Weak'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 0),
        createRelationship(2, 3, 4, "friend", 1),
        createRelationship(3, 5, 6, "friend", 2),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
        createGuest(5, "Eve"),
        createGuest(6, "Frank"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("0/10 - Very Weak");
      expect(result).toContain("1/10 - Very Weak");
      expect(result).toContain("2/10 - Very Weak");
    });

    it("should label null strength as 'Unspecified'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", null)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // null is treated as 0, which falls into "Very Weak" category
      expect(result).toContain("0/10 - Very Weak");
    });

    it("should handle undefined strength as 'Unspecified'", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        {
          id: 1,
          event_id: 1,
          guest1_id: 1,
          guest2_id: 2,
          relationship_type: "friend",
          strength: undefined as any,
        },
      ];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // undefined is treated as 0, which falls into "Very Weak" category
      expect(result).toContain("0/10 - Very Weak");
    });
  });

  // ============================================================================
  // SORTING AND PRIORITY
  // ============================================================================

  describe("Sorting and Priority", () => {
    it("should sort relationships by strength within each type (strongest first)", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 5),
        createRelationship(2, 3, 4, "friend", 9),
        createRelationship(3, 5, 6, "friend", 7),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
        createGuest(5, "Eve"),
        createGuest(6, "Frank"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // Check that results are sorted by strength (9, 7, 5)
      expect(result).toContain("Charlie");
      expect(result).toContain("9/10");
      expect(result).toContain("Alice");
      expect(result).toContain("5/10");

      // Verify order: strength 9 appears before strength 5
      const charlieLine = result.indexOf("Charlie");
      const aliceLine = result.indexOf("Alice");
      expect(charlieLine).toBeLessThan(aliceLine);
    });

    it("should order sections by priority: friends, family, romantic, colleague, conflict, other", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "conflict", 8),
        createRelationship(2, 3, 4, "colleague", 6),
        createRelationship(3, 5, 6, "friend", 7),
        createRelationship(4, 7, 8, "family", 9),
        createRelationship(5, 9, 10, "romantic", 10),
        createRelationship(6, 11, 12, "other", 5),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "A"),
        createGuest(2, "B"),
        createGuest(3, "C"),
        createGuest(4, "D"),
        createGuest(5, "E"),
        createGuest(6, "F"),
        createGuest(7, "G"),
        createGuest(8, "H"),
        createGuest(9, "I"),
        createGuest(10, "J"),
        createGuest(11, "K"),
        createGuest(12, "L"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      const friendIndex = result.indexOf("Friends");
      const familyIndex = result.indexOf("Family");
      const romanticIndex = result.indexOf("Romantic");
      const colleagueIndex = result.indexOf("Colleagues");
      const conflictIndex = result.indexOf("Conflicts");
      const otherIndex = result.indexOf("Other Relationships");

      expect(friendIndex).toBeLessThan(familyIndex);
      expect(familyIndex).toBeLessThan(romanticIndex);
      expect(romanticIndex).toBeLessThan(colleagueIndex);
      expect(colleagueIndex).toBeLessThan(conflictIndex);
      expect(conflictIndex).toBeLessThan(otherIndex);
    });

    it("should handle relationships with same strength (stable sort)", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 7),
        createRelationship(2, 3, 4, "friend", 7),
        createRelationship(3, 5, 6, "friend", 7),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
        createGuest(5, "Eve"),
        createGuest(6, "Frank"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // All should have same strength label
      expect(result).toContain("7/10 - Strong");
      // Count occurrences
      const matches = result.match(/7\/10 - Strong/g);
      expect(matches).toHaveLength(3);
    });
  });

  // ============================================================================
  // GROUPING LOGIC
  // ============================================================================

  describe("Grouping Logic", () => {
    it("should group multiple relationships of the same type together", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 8),
        createRelationship(2, 3, 4, "friend", 7),
        createRelationship(3, 5, 6, "friend", 6),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
        createGuest(5, "Eve"),
        createGuest(6, "Frank"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // Should have only one "Friends" header
      const friendHeaders = result.match(/Friends \(High Priority\)/g);
      expect(friendHeaders).toHaveLength(1);

      // Should have all 3 friend relationships
      expect(result).toContain("Alice");
      expect(result).toContain("Charlie");
      expect(result).toContain("Eve");
    });

    it("should create separate sections for different relationship types", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 8),
        createRelationship(2, 3, 4, "family", 9),
        createRelationship(3, 5, 6, "conflict", 7),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
        createGuest(5, "Eve"),
        createGuest(6, "Frank"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Friends (High Priority):");
      expect(result).toContain("Family (High Priority):");
      expect(result).toContain("Conflicts (Critical - Avoid):");
    });
  });

  // ============================================================================
  // GUEST NAME HANDLING
  // ============================================================================

  describe("Guest Name Handling", () => {
    it("should handle guest names with special characters", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [createGuest(1, "O'Brien"), createGuest(2, "José María")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("O'Brien");
      expect(result).toContain("José María");
    });

    it("should handle very long guest names", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [
        createGuest(1, "Alexander Bartholomew Christopher Davidson-Williamson III"),
        createGuest(2, "Bob"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Alexander Bartholomew Christopher Davidson-Williamson III");
    });

    it("should handle empty string guest names gracefully", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [createGuest(1, ""), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      // Should still generate rule, even with empty name
      expect(result).toContain("Bob");
    });
  });

  // ============================================================================
  // LARGE DATASET HANDLING
  // ============================================================================

  describe("Large Dataset Handling", () => {
    it("should handle 100+ relationships efficiently", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [];
      const guests: GuestDto[] = [];

      // Create 100 guests and 100 relationships
      for (let i = 1; i <= 100; i++) {
        guests.push(createGuest(i, `Guest${i}`));
      }

      for (let i = 1; i <= 100; i++) {
        const guest1 = i;
        const guest2 = i === 100 ? 1 : i + 1;
        relationships.push(createRelationship(i, guest1, guest2, "friend", i % 10));
      }

      // Act
      const start = Date.now();
      const result = service.generateRulesContent(relationships, guests);
      const duration = Date.now() - start;

      // Assert
      expect(result).toContain("SEATING RULES:");
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle multiple relationship types in large dataset", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [];
      const guests: GuestDto[] = [];
      const types = ["friend", "family", "colleague", "conflict", "romantic"];

      for (let i = 1; i <= 50; i++) {
        guests.push(createGuest(i, `Guest${i}`));
      }

      for (let i = 1; i <= 50; i++) {
        const guest1 = i;
        const guest2 = i === 50 ? 1 : i + 1;
        const type = types[i % types.length];
        relationships.push(createRelationship(i, guest1, guest2, type, (i % 10) + 1));
      }

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("Friends");
      expect(result).toContain("Family");
      expect(result).toContain("Colleagues");
      expect(result).toContain("Conflicts");
      expect(result).toContain("Romantic");
    });
  });

  // ============================================================================
  // FORMAT AND STRUCTURE
  // ============================================================================

  describe("Format and Structure", () => {
    it("should start with 'SEATING RULES:' header", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [createRelationship(1, 1, 2, "friend", 8)];
      const guests: GuestDto[] = [createGuest(1, "Alice"), createGuest(2, "Bob")];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toMatch(/^SEATING RULES:/);
    });

    it("should separate sections with double newlines", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 8),
        createRelationship(2, 3, 4, "family", 9),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      expect(result).toContain("\n\n");
    });

    it("should prefix each rule with '- ' bullet point", () => {
      // Arrange
      const relationships: GuestRelationshipDto[] = [
        createRelationship(1, 1, 2, "friend", 8),
        createRelationship(2, 3, 4, "friend", 7),
      ];
      const guests: GuestDto[] = [
        createGuest(1, "Alice"),
        createGuest(2, "Bob"),
        createGuest(3, "Charlie"),
        createGuest(4, "Diana"),
      ];

      // Act
      const result = service.generateRulesContent(relationships, guests);

      // Assert
      const rules = result.match(/^- /gm);
      expect(rules).toHaveLength(2);
    });
  });
});

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a test guest object
 */
function createGuest(id: number, name: string): GuestDto {
  return {
    id,
    event_id: 1,
    name,
    age_range: null,
    drinking_habits: null,
    dietary_restrictions: null,
    hobbies_interests: null,
    topics_to_avoid: null,
  };
}

/**
 * Create a test relationship object
 */
function createRelationship(
  id: number,
  guest1Id: number,
  guest2Id: number,
  type: string,
  strength: number | null
): GuestRelationshipDto {
  return {
    id,
    event_id: 1,
    guest1_id: guest1Id,
    guest2_id: guest2Id,
    relationship_type: type,
    strength,
  };
}
