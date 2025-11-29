import type { GuestRelationshipDto, GuestDto } from "../types";

/**
 * Service for building seating rule content from guest relationships
 *
 * Generates human-readable and AI-friendly rule descriptions based on
 * guest relationships, used in seating plan optimization prompts.
 */
export class RulesBuilderService {
  /**
   * Generate formatted rules content from guest relationships
   *
   * Transforms relationship data into natural language rules for AI consumption,
   * categorized by relationship type and strength.
   *
   * @param relationships - Array of guest relationships with strength ratings
   * @param guests - Array of guests to resolve names from IDs
   * @returns Formatted rules content string for AI prompt
   *
   * @example
   * ```typescript
   * const service = new RulesBuilderService();
   * const rules = service.generateRulesContent(relationships, guests);
   * // Returns: "SEATING RULES:\n\nFriends (High Priority):\n- Seat Alice near Bob (strength: 9/10)..."
   * ```
   */
  generateRulesContent(
    relationships: GuestRelationshipDto[],
    guests: GuestDto[]
  ): string {
    // Edge case: No relationships
    if (!relationships || relationships.length === 0) {
      return "No specific seating rules defined. Optimize based on general compatibility.";
    }

    // Edge case: No guests (shouldn't happen but defensive)
    if (!guests || guests.length === 0) {
      return "No guests available for rule generation.";
    }

    // Create guest lookup map for O(1) name resolution
    const guestMap = new Map<number, GuestDto>();
    guests.forEach(guest => guestMap.set(guest.id, guest));

    // Group relationships by type and strength
    const grouped = this.groupRelationships(relationships);

    // Build rule sections
    const sections: string[] = ["SEATING RULES:"];

    // Priority order: friends/family (positive), conflicts (negative), others
    const priorityOrder = ["friend", "family", "romantic", "colleague", "conflict", "other"];

    for (const relType of priorityOrder) {
      const rels = grouped.get(relType);
      if (!rels || rels.length === 0) continue;

      const section = this.buildRelationshipSection(relType, rels, guestMap);
      if (section) {
        sections.push(section);
      }
    }

    // Add any relationship types not in priority list
    grouped.forEach((rels, relType) => {
      if (!priorityOrder.includes(relType)) {
        const section = this.buildRelationshipSection(relType, rels, guestMap);
        if (section) {
          sections.push(section);
        }
      }
    });

    return sections.join("\n\n");
  }

  /**
   * Group relationships by type
   */
  private groupRelationships(
    relationships: GuestRelationshipDto[]
  ): Map<string, GuestRelationshipDto[]> {
    const grouped = new Map<string, GuestRelationshipDto[]>();

    for (const rel of relationships) {
      // Normalize relationship type (handle null/undefined)
      const type = (rel.relationship_type || "other").toLowerCase().trim();

      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(rel);
    }

    return grouped;
  }

  /**
   * Build a section for a specific relationship type
   */
  private buildRelationshipSection(
    relType: string,
    relationships: GuestRelationshipDto[],
    guestMap: Map<number, GuestDto>
  ): string | null {
    // Get metadata for this relationship type
    const meta = this.getRelationshipMetadata(relType);

    // Sort by strength (descending) - strongest relationships first
    const sorted = [...relationships].sort((a, b) => {
      const strengthA = a.strength ?? 0;
      const strengthB = b.strength ?? 0;
      return strengthB - strengthA;
    });

    // Build rules for each relationship
    const rules: string[] = [];

    for (const rel of sorted) {
      const guest1 = guestMap.get(rel.guest1_id);
      const guest2 = guestMap.get(rel.guest2_id);

      // Skip if guests not found (data integrity issue)
      if (!guest1 || !guest2) {
        continue;
      }

      const rule = this.formatRule(guest1, guest2, rel, meta);
      if (rule) {
        rules.push(rule);
      }
    }

    // Don't create section if no valid rules
    if (rules.length === 0) {
      return null;
    }

    // Build section header with priority indicator
    const header = `${meta.label} (${meta.priority}):`;

    return `${header}\n${rules.map(r => `- ${r}`).join("\n")}`;
  }

  /**
   * Format a single relationship as a rule
   */
  private formatRule(
    guest1: GuestDto,
    guest2: GuestDto,
    relationship: GuestRelationshipDto,
    meta: RelationshipMetadata
  ): string | null {
    const strength = relationship.strength ?? 0;
    const strengthLabel = this.getStrengthLabel(strength);

    // Build rule based on relationship type
    if (meta.action === "seat_together") {
      return `Seat ${guest1.name} near ${guest2.name} (strength: ${strength}/10 - ${strengthLabel})`;
    } else if (meta.action === "keep_separate") {
      return `Keep ${guest1.name} away from ${guest2.name} (severity: ${strength}/10 - ${strengthLabel})`;
    } else {
      return `${guest1.name} and ${guest2.name}: ${meta.label} relationship (strength: ${strength}/10)`;
    }
  }

  /**
   * Get metadata for relationship type
   */
  private getRelationshipMetadata(relType: string): RelationshipMetadata {
    const metadata: Record<string, RelationshipMetadata> = {
      friend: {
        label: "Friends",
        priority: "High Priority",
        action: "seat_together",
      },
      family: {
        label: "Family",
        priority: "High Priority",
        action: "seat_together",
      },
      romantic: {
        label: "Romantic Partners",
        priority: "Critical Priority",
        action: "seat_together",
      },
      colleague: {
        label: "Colleagues",
        priority: "Medium Priority",
        action: "seat_together",
      },
      conflict: {
        label: "Conflicts",
        priority: "Critical - Avoid",
        action: "keep_separate",
      },
      other: {
        label: "Other Relationships",
        priority: "Low Priority",
        action: "neutral",
      },
    };

    return metadata[relType] || metadata.other;
  }

  /**
   * Get strength label from numeric value
   */
  private getStrengthLabel(strength: number | null): string {
    if (strength === null || strength === undefined) {
      return "Unspecified";
    }

    if (strength >= 9) return "Very Strong";
    if (strength >= 7) return "Strong";
    if (strength >= 5) return "Moderate";
    if (strength >= 3) return "Weak";
    return "Very Weak";
  }
}

/**
 * Metadata for relationship types
 */
interface RelationshipMetadata {
  label: string;
  priority: string;
  action: "seat_together" | "keep_separate" | "neutral";
}
