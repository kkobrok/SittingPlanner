import React from "react";
import { Button } from "@/components/ui/button";

interface PlanToolbarProps {
  isGenerating: boolean;
  disabled: boolean;
  onGenerateClick: () => void;
  onExportClick?: () => void;
  onAutoArrangeToggle?: (val: boolean) => void;
}

export function PlanToolbar({
  isGenerating,
  disabled,
  onGenerateClick,
  onExportClick,
  onAutoArrangeToggle,
}: PlanToolbarProps) {
  return (
    <div className="flex gap-3 items-center mb-4">
      <Button disabled={disabled || isGenerating} onClick={onGenerateClick}>
        {isGenerating ? "Generating…" : "Generate"}
      </Button>
      <Button variant="secondary" disabled={disabled} onClick={onExportClick}>
        Export
      </Button>
      <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer select-none">
        <input
          type="checkbox"
          onChange={(e) => onAutoArrangeToggle?.(e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring cursor-pointer"
        />
        <span className="text-sm font-medium">Auto-arrange</span>
      </label>
    </div>
  );
}
