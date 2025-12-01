/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import React from "react";

interface GuestCardProps {
  guest: any;
  assignment?: any;
  seatPosition?: number | null;
  onDragStart?: (guestId: number) => void;
  onContextMenu?: (guestId: number) => void;
  onMoveKeyboard?: (guestId: number) => void;
}

export function GuestCard({
  guest,
  assignment,
  seatPosition,
  onDragStart,
  onContextMenu,
  onMoveKeyboard,
}: GuestCardProps) {
  return (
    <div
      className="border border-border/60 rounded-lg px-3 py-3 bg-card/95 backdrop-blur-sm flex items-center gap-2.5 cursor-move shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-border transition-all duration-150 active:scale-[0.98]"
      draggable
      onDragStart={() => onDragStart?.(guest.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(guest.id);
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onMoveKeyboard?.(guest.id);
      }}
      aria-label={`Guest: ${guest.name}${seatPosition ? `, Seat ${seatPosition}` : ""}`}
    >
      {seatPosition && (
        <span className="inline-flex items-center justify-center w-7 h-7 text-sm font-bold bg-primary/15 text-primary rounded-md border border-primary/30">
          {seatPosition}
        </span>
      )}
      <span className="font-semibold text-base">{guest.name}</span>
      {/* Add icons/tags for dietary/conflicts here */}
    </div>
  );
}
