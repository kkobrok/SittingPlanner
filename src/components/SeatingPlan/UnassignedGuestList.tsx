import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface UnassignedGuestListProps {
  guests: any[];
  onQuickAssign: (guestId: number, tableId: number) => void;
}

export function UnassignedGuestList({ guests, onQuickAssign }: UnassignedGuestListProps) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-base mb-3 tracking-tight">Unassigned Guests</h3>
      {guests.length === 0 ? (
        <p className="text-sm text-muted-foreground">All guests are assigned</p>
      ) : (
        <ul className="space-y-2">
          {guests.map((guest) => (
            <li key={guest.id}>
              <DraggableUnassignedGuest guest={guest} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DraggableUnassignedGuest({ guest }: { guest: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2.5 border border-border/60 rounded-lg px-3 py-2.5 bg-card/95 backdrop-blur-sm cursor-move shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-border transition-all duration-150 active:scale-[0.98]"
      tabIndex={0}
      aria-label={`Unassigned guest: ${guest.name}`}
    >
      <span className="font-semibold text-sm">{guest.name}</span>
    </div>
  );
}
