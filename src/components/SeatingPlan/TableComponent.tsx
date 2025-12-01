/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from "react";

interface TableComponentProps {
  table: any;
  assignedGuests: any[];
  onDrop: (guestId: number) => void;
}

export function TableComponent({ table, assignedGuests, onDrop }: TableComponentProps) {
  return (
    <div
      className="border border-border/60 rounded-xl p-4 mb-3 bg-card/95 backdrop-blur-sm shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-150"
      aria-label={`Table ${table.name}`}
    >
      <div className="font-semibold text-sm tracking-tight">Table: {table.name}</div>
    </div>
  );
}
