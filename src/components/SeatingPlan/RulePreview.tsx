import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { GuestRelationshipWithDetailsDto } from "@/types";

interface RulePreviewProps {
  relationships?: GuestRelationshipWithDetailsDto[];
  loading?: boolean;
}

/**
 * Displays guest relationships and seating rules for preview
 * Shows relationship types (friend, family, conflict) with strength indicators
 */
export function RulePreview({ relationships = [], loading = false }: RulePreviewProps) {
  // Group relationships by type
  const groupedRelationships = React.useMemo(() => {
    const groups: Record<string, GuestRelationshipWithDetailsDto[]> = {};

    relationships.forEach((rel) => {
      const type = rel.relationship_type || "other";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(rel);
    });

    return groups;
  }, [relationships]);

  // Relationship type metadata for display
  const relationshipMeta: Record<string, { label: string; color: string; emoji: string }> = {
    friend: { label: "Friends", color: "text-blue-600", emoji: "👥" },
    family: { label: "Family", color: "text-green-600", emoji: "👨‍👩‍👧‍👦" },
    conflict: { label: "Conflicts", color: "text-red-600", emoji: "⚠️" },
    colleague: { label: "Colleagues", color: "text-purple-600", emoji: "💼" },
    romantic: { label: "Romantic", color: "text-pink-600", emoji: "💕" },
    other: { label: "Other", color: "text-gray-600", emoji: "🔗" },
  };

  const getStrengthLabel = (strength: number | null): string => {
    if (!strength) return "";
    if (strength >= 8) return "Strong";
    if (strength >= 5) return "Medium";
    return "Weak";
  };

  const getStrengthColor = (strength: number | null): string => {
    if (!strength) return "bg-gray-200";
    if (strength >= 8) return "bg-green-500";
    if (strength >= 5) return "bg-yellow-500";
    return "bg-orange-500";
  };

  if (loading) {
    return (
      <Card className="p-5">
        <CardHeader className="pb-4">
          <CardTitle>Guest Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (relationships.length === 0) {
    return (
      <Card className="p-5">
        <CardHeader className="pb-4">
          <CardTitle>Guest Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No relationships defined yet. Add guest relationships to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <CardHeader className="pb-4">
        <CardTitle>Guest Relationships</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {relationships.length} relationship{relationships.length !== 1 ? "s" : ""} defined
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedRelationships).map(([type, rels]) => {
          const meta = relationshipMeta[type] || relationshipMeta.other;

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="text-lg">{meta.emoji}</span>
                <h4 className={`font-semibold text-sm ${meta.color}`}>{meta.label}</h4>
                <span className="text-xs text-muted-foreground ml-auto">({rels.length})</span>
              </div>

              <div className="space-y-2">
                {rels.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{rel.guest1.name}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-sm font-medium truncate">{rel.guest2.name}</span>
                    </div>

                    {rel.strength !== null && (
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <div className="flex items-center gap-1">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 h-3 rounded-full ${
                                i < rel.strength! ? getStrengthColor(rel.strength) : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono w-14">
                          {getStrengthLabel(rel.strength)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
