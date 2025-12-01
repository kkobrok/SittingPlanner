/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Button } from "@/components/ui/button";

interface MoveGuestModalProps {
  open: boolean;
  guest?: any;
  tables: any[];
  onConfirm: (tableId: number) => void;
  onClose: () => void;
}

export function MoveGuestModal({ open, guest, tables, onConfirm, onClose }: MoveGuestModalProps) {
  if (!open || !guest) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-border rounded-2xl shadow-[var(--shadow-xl)] min-w-[340px] max-w-md w-full overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight mb-2">Move Guest</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select a table for <span className="font-semibold text-foreground">{guest.name}</span>:
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto mb-6 -mx-1 px-1">
            {tables.map((table) => (
              <li key={table.id}>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => onConfirm(table.id)}
                >
                  <span>{table.name}</span>
                  <span className="text-xs text-muted-foreground">cap: {table.capacity}</span>
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
