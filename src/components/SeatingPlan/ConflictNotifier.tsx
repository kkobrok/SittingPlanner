import React from "react";
import { Button } from "@/components/ui/button";

interface Conflict {
  type: string;
  guest1_id: number;
  guest2_id: number;
  severity: string;
  message: string;
}

interface ConflictNotifierProps {
  results: { conflicts: Conflict[]; recommendations?: string[] } | null;
  onRevert?: () => void;
}

export function ConflictNotifier({ results, onRevert }: ConflictNotifierProps) {
  if (!results || !results.conflicts?.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full p-4">
      <div className="bg-destructive/10 dark:bg-destructive/20 backdrop-blur-md border-2 border-destructive/40 rounded-xl p-5 shadow-[var(--shadow-lg)] animate-in slide-in-from-top-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-base tracking-tight text-destructive dark:text-destructive-foreground mb-1">
              Conflicts Detected
            </h3>
          </div>
        </div>

        <ul className="mb-4 space-y-2">
          {results.conflicts.map((c, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
              <span className="font-semibold text-xs uppercase text-destructive/80 dark:text-destructive-foreground/80 mt-0.5 shrink-0">
                {c.severity}:
              </span>
              <span className="text-destructive dark:text-destructive-foreground/90">{c.message}</span>
            </li>
          ))}
        </ul>

        {results.recommendations && results.recommendations.length > 0 && (
          <div className="mb-4 pt-3 border-t border-destructive/20">
            <div className="font-semibold text-xs uppercase tracking-wide text-destructive/70 dark:text-destructive-foreground/70 mb-2">
              Recommendations
            </div>
            <ul className="space-y-1.5 ml-4 list-disc marker:text-destructive/60">
              {results.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-destructive dark:text-destructive-foreground/90">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {onRevert && (
          <Button size="sm" variant="destructive" className="w-full" onClick={onRevert}>
            Revert Change
          </Button>
        )}
      </div>
    </div>
  );
}
