import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PlanSummaryProps {
  optimizationScore?: number;
  totalGuests?: number;
  assigned?: number;
  unassigned?: number;
  warnings?: string[];
}

export function PlanSummary({ optimizationScore, totalGuests, assigned, unassigned, warnings }: PlanSummaryProps) {
  return (
    <Card className="p-5">
      <CardHeader className="pb-4">
        <CardTitle>Plan Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Score</span>
          <span className="font-mono font-semibold">{optimizationScore ?? '-'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Guests</span>
          <span className="font-semibold">{assigned ?? 0} / {totalGuests ?? 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Unassigned</span>
          <span className="font-semibold">{unassigned ?? 0}</span>
        </div>
        {warnings && warnings.length > 0 && (
          <ul className="mt-4 space-y-2 pt-4 border-t border-border/40">
            {warnings.map((w, i) => (
              <li key={i} className="text-destructive text-sm flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
