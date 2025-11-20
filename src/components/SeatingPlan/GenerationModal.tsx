import React from 'react';
import { Button } from '@/components/ui/button';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (options: any) => void;
}

export function GenerationModal({ isOpen, onClose, onStart }: GenerationModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-2xl shadow-[var(--shadow-xl)] min-w-[340px] max-w-md w-full overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold tracking-tight mb-6">Generate Seating Plan</h2>
          {/* Sliders/inputs for weights/constraints here */}
          <div className="flex gap-3 mt-6">
            <Button className="flex-1" onClick={() => onStart({})}>Start</Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
