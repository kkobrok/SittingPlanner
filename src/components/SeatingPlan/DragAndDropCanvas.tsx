import React from 'react';
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { TableComponent } from './TableComponent';
import { GuestCard } from './GuestCard';
import { UnassignedGuestList } from './UnassignedGuestList';
import { PlanSummary } from './PlanSummary';
import { TableWithSeats } from './TableWithSeats';
import { Button } from '../ui/button';

type ViewMode = 'table' | 'seat';

interface DragAndDropCanvasProps {
  tables: any[];
  guests: any[];
  assignments: any[];
  unassignedGuests: any[];
  onDrop: (guestId: number, toTableId: number, seatPosition?: number) => void;
  onUnassign: (guestId: number) => void;
  planSummary: {
    optimizationScore: number;
    totalGuests: number;
    assigned: number;
    unassigned: number;
    warnings: string[];
  };
}

export function DragAndDropCanvas({ tables, guests, assignments, unassignedGuests, onDrop, onUnassign, planSummary }: DragAndDropCanvasProps) {
  // View mode state
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');

  // Map guestId to assignment
  const guestAssignments = Object.fromEntries(assignments.map((a: any) => [a.guest_id, a]));

  // Map tableId to assigned guests with their assignments (including seat_position)
  const tableGuests: Record<number, Array<{ guest: any; assignment: any }>> = {};
  tables.forEach((table: any) => { tableGuests[table.id] = []; });
  assignments.forEach((a: any) => {
    if (tableGuests[a.table_id]) {
      const guest = guests.find((g: any) => g.id === a.guest_id);
      if (guest) {
        tableGuests[a.table_id].push({ guest, assignment: a });
      }
    }
  });

  // Create seat data structure for seat view
  const tableSeats: Record<number, Array<{ position: number; guest: any | null; assignment: any | null }>> = {};
  tables.forEach((table: any) => {
    tableSeats[table.id] = [];

    // Initialize all seats as empty
    for (let i = 1; i <= table.capacity; i++) {
      tableSeats[table.id].push({ position: i, guest: null, assignment: null });
    }

    const tableAssignments = assignments.filter((a: any) => a.table_id === table.id);

    // First pass: Place guests with explicit seat_position
    tableAssignments.forEach((assignment: any) => {
      if (assignment.seat_position && assignment.seat_position <= table.capacity) {
        const guest = guests.find((g: any) => g.id === assignment.guest_id);
        if (guest) {
          tableSeats[table.id][assignment.seat_position - 1] = {
            position: assignment.seat_position,
            guest,
            assignment
          };
        }
      }
    });

    // Second pass: Auto-place guests without explicit seat_position into available seats
    // (They can then be dragged to specific seats to save their position permanently)
    const unpositionedAssignments = tableAssignments.filter((a: any) => !a.seat_position);
    let nextAvailableSeat = 0;
    unpositionedAssignments.forEach((assignment: any) => {
      // Find next empty seat
      while (nextAvailableSeat < table.capacity && tableSeats[table.id][nextAvailableSeat].guest !== null) {
        nextAvailableSeat++;
      }

      if (nextAvailableSeat < table.capacity) {
        const guest = guests.find((g: any) => g.id === assignment.guest_id);
        if (guest) {
          tableSeats[table.id][nextAvailableSeat] = {
            position: nextAvailableSeat + 1,
            guest,
            assignment
          };
          nextAvailableSeat++;
        }
      }
    });
  });

  // Drag-and-drop state
  const [activeId, setActiveId] = React.useState<number | null>(null);

  function handleDragStart(event: any) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);
    if (active && over && active.id && over.id) {
      // Check if dropped on "unassigned" zone
      if (over.id === 'unassigned-zone') {
        onUnassign(active.id);
        return;
      }

      // Check if dropped on a specific seat (format: seat-{tableId}-{position})
      if (typeof over.id === 'string' && over.id.startsWith('seat-')) {
        const parts = over.id.split('-');
        if (parts.length === 3) {
          const tableId = parseInt(parts[1]);
          const seatPosition = parseInt(parts[2]);
          onDrop(active.id, tableId, seatPosition);
          return;
        }
      }

      // Otherwise, dropped on a table (table view)
      if (active.id !== over.id) {
        onDrop(active.id, over.id);
      }
    }
  }

  function handleDropOnSeat(guestId: number, tableId: number, seatPosition: number) {
    onDrop(guestId, tableId, seatPosition);
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card/95 backdrop-blur-sm p-5 rounded-xl border border-border/60 shadow-[var(--shadow-md)]">
          {/* View mode toggle */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Seating Arrangement</h2>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table View
              </Button>
              <Button
                variant={viewMode === 'seat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('seat')}
              >
                Seat View
              </Button>
            </div>
          </div>

          {/* Canvas area */}
          <div className="min-h-[400px] bg-accent/20 rounded-lg p-6 flex flex-wrap gap-8 items-start justify-start" aria-label="Seating Plan Canvas">
            {viewMode === 'table' ? (
              // Table view - original layout
              tables.map((table: any) => (
                <DroppableTable
                  key={table.id}
                  table={table}
                  assignedGuests={tableGuests[table.id] || []}
                  activeId={activeId}
                />
              ))
            ) : (
              // Seat view - detailed seat grid
              tables.map((table: any) => (
                <TableWithSeats
                  key={table.id}
                  table={table}
                  seats={tableSeats[table.id] || []}
                  onDropOnSeat={handleDropOnSeat}
                  activeGuestId={activeId}
                />
              ))
            )}
          </div>
        </div>
        <aside className="bg-card/95 backdrop-blur-sm p-5 rounded-xl border border-border/60 shadow-[var(--shadow-md)]">
          <DroppableUnassignedZone activeId={activeId}>
            <UnassignedGuestList
              guests={unassignedGuests}
              onQuickAssign={(guestId, tableId) => onDrop(guestId, tableId)}
            />
          </DroppableUnassignedZone>
          <PlanSummary
            optimizationScore={planSummary.optimizationScore}
            totalGuests={planSummary.totalGuests}
            assigned={planSummary.assigned}
            unassigned={planSummary.unassigned}
            warnings={planSummary.warnings}
          />
        </aside>
      </div>
    </DndContext>
  );
}

function DroppableTable({ table, assignedGuests, activeId }: { table: any; assignedGuests: Array<{ guest: any; assignment: any }>; activeId: number | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });

  // Table type visual indicators
  const tableTypeIcons: Record<string, string> = {
    round: '○',
    rectangle: '▭',
    square: '□',
    oval: '⬭',
    u_shape: '⊐',
    banquet: '▬',
    wave: '〰'
  };

  const tableType = table.table_type || 'rectangle';
  const icon = tableTypeIcons[tableType] || '▭';

  // Get visual styling based on table type with dynamic sizing
  const getTableShapeClasses = () => {
    // Round/oval tables need more space for readability
    const isCircular = tableType === 'round' || tableType === 'oval';

    // Scale based on capacity - circular tables get MUCH larger sizes for readability
    const sizeClass = isCircular
      ? (table.capacity <= 4 ? 'w-[400px]' :
         table.capacity <= 8 ? 'w-[500px]' :
         table.capacity <= 12 ? 'w-[600px]' : 'w-[700px]')
      : (table.capacity <= 4 ? 'max-w-[200px]' :
         table.capacity <= 8 ? 'max-w-[250px]' :
         table.capacity <= 12 ? 'max-w-[300px]' : 'max-w-[350px]');

    switch (tableType) {
      case 'round':
        return `rounded-full aspect-square ${sizeClass} mx-auto`;
      case 'oval':
        return `rounded-[50%] aspect-[4/3] ${sizeClass} mx-auto`;
      case 'square':
        return `rounded-lg aspect-square ${sizeClass} mx-auto`;
      case 'u_shape':
        return `rounded-lg border-b-4 border-b-primary/20 ${sizeClass}`;
      case 'wave':
        return `rounded-[20px_60px_20px_60px] ${sizeClass}`;
      case 'banquet':
        return `rounded-lg aspect-[2/1] ${sizeClass}`;
      default: // rectangle
        return `rounded-lg ${sizeClass}`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`border border-border/60 p-3 mb-2 min-h-[120px] transition-all duration-150 ${getTableShapeClasses()} ${
        isOver ? 'bg-primary/10 border-primary shadow-[var(--shadow-md)]' : 'bg-card'
      }`}
      aria-label={`Table ${table.name}`}
      tabIndex={0}
    >
      <div className="font-semibold mb-2 tracking-tight flex items-center gap-2">
        <span className="text-lg" title={tableType}>{icon}</span>
        {table.name} <span className="text-xs text-muted-foreground">(cap: {table.capacity})</span>
      </div>
      <div className="flex flex-col gap-2">
        {assignedGuests.map(({ guest, assignment }) => (
          <DraggableGuestCard key={guest.id} guest={guest} seatPosition={assignment.seat_position} />
        ))}
      </div>
    </div>
  );
}

function DraggableGuestCard({ guest, seatPosition }: { guest: any; seatPosition?: number | null }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <GuestCard guest={guest} seatPosition={seatPosition} />
    </div>
  );
}

function DroppableUnassignedZone({ activeId, children }: { activeId: number | null; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned-zone' });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-all duration-150 ${
        isOver ? 'bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-400 dark:ring-orange-600' : ''
      }`}
    >
      {children}
    </div>
  );
}
