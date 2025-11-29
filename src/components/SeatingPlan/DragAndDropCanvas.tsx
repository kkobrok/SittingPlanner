import React from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { TableComponent } from './TableComponent';
import { GuestCard } from './GuestCard';
import { UnassignedGuestList } from './UnassignedGuestList';
import { PlanSummary } from './PlanSummary';
import { RulePreview } from './RulePreview';
import { TableWithSeats } from './TableWithSeats';
import { BottomNavigation } from './BottomNavigation';
import { Button } from '../ui/button';
import type { GuestRelationshipWithDetailsDto } from '@/types';

type ViewMode = 'table' | 'seat';
type MobilePanel = 'guests' | 'plan' | 'summary';

interface DragAndDropCanvasProps {
  tables: any[];
  guests: any[];
  assignments: any[];
  relationships: any[];
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

export function DragAndDropCanvas({ tables, guests, assignments, relationships, unassignedGuests, onDrop, onUnassign, planSummary }: DragAndDropCanvasProps) {
  // View mode state
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');

  // Mobile panel state
  const [activePanel, setActivePanel] = React.useState<MobilePanel>('plan');

  // Scroll position preservation for mobile panels
  const scrollPositions = React.useRef<Record<MobilePanel, number>>({
    guests: 0,
    plan: 0,
    summary: 0
  });
  const panelRefs = React.useRef<Record<MobilePanel, HTMLDivElement | null>>({
    guests: null,
    plan: null,
    summary: null
  });

  // Save scroll position when switching panels
  const handlePanelChange = React.useCallback((newPanel: MobilePanel) => {
    const currentPanelRef = panelRefs.current[activePanel];
    if (currentPanelRef) {
      scrollPositions.current[activePanel] = currentPanelRef.scrollTop;
    }
    setActivePanel(newPanel);
  }, [activePanel]);

  // Restore scroll position when panel mounts
  React.useEffect(() => {
    const panelRef = panelRefs.current[activePanel];
    if (panelRef) {
      panelRef.scrollTop = scrollPositions.current[activePanel];
    }
  }, [activePanel]);

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
  const [activeGuest, setActiveGuest] = React.useState<any | null>(null);
  const mousePosRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Track mouse position globally
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (activeId) {
        forceUpdate();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [activeId]);

  function handleDragStart(event: any) {
    const guestId = event.active.id;
    setActiveId(guestId);
    // Find the guest being dragged
    const guest = guests.find((g: any) => g.id === guestId);
    setActiveGuest(guest || null);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    setActiveId(null);
    setActiveGuest(null);
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
      {/* Desktop Layout - Three columns (≥ md: 768px) */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
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
          <div
            className={`min-h-[300px] bg-accent/10 rounded-lg p-4 ${
              viewMode === 'table'
                ? 'grid gap-4 items-start content-start grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'flex flex-wrap gap-4 items-start content-start'
            }`}
            aria-label="Seating Plan Canvas"
          >
            {viewMode === 'table' ? (
              // Table view - compact layout
              tables.map((table: any) => (
                <DroppableTable
                  key={table.id}
                  table={table}
                  assignedGuests={tableGuests[table.id] || []}
                  activeId={activeId}
                />
              ))
            ) : (
              // Seat view - more space for seat arrangements
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
        <aside className="sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto bg-card/95 backdrop-blur-sm p-5 rounded-xl border border-border/60 shadow-[var(--shadow-md)] space-y-6">
          <DroppableUnassignedZone activeId={activeId}>
            <UnassignedGuestList
              guests={unassignedGuests}
              onQuickAssign={(guestId, tableId) => onDrop(guestId, tableId)}
            />
          </DroppableUnassignedZone>
          <RulePreview
            relationships={relationships as GuestRelationshipWithDetailsDto[]}
            loading={false}
          />
          <PlanSummary
            optimizationScore={planSummary.optimizationScore}
            totalGuests={planSummary.totalGuests}
            assigned={planSummary.assigned}
            unassigned={planSummary.unassigned}
            warnings={planSummary.warnings}
          />
        </aside>
      </div>

      {/* Mobile Layout - Single panel with bottom navigation (< md: 768px) */}
      <div className="md:hidden pb-16">
        {/* Guests Panel */}
        <div
          ref={(el) => { panelRefs.current.guests = el; }}
          className={`${activePanel === 'guests' ? 'block' : 'hidden'} transition-opacity duration-300 overflow-y-auto max-h-[calc(100vh-8rem)]`}
          role="tabpanel"
          aria-label="Guests panel"
        >
          <div className="space-y-4">
            <DroppableUnassignedZone activeId={activeId}>
              <UnassignedGuestList
                guests={unassignedGuests}
                onQuickAssign={(guestId, tableId) => onDrop(guestId, tableId)}
              />
            </DroppableUnassignedZone>
            <RulePreview
              relationships={relationships as GuestRelationshipWithDetailsDto[]}
              loading={false}
            />
          </div>
        </div>

        {/* Plan Panel */}
        <div
          ref={(el) => { panelRefs.current.plan = el; }}
          className={`${activePanel === 'plan' ? 'block' : 'hidden'} transition-opacity duration-300 overflow-y-auto max-h-[calc(100vh-8rem)]`}
          role="tabpanel"
          aria-label="Seating plan panel"
        >
          <div className="bg-card/95 backdrop-blur-sm p-4 rounded-xl border border-border/60 shadow-[var(--shadow-md)]">
            {/* View mode toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Seating Arrangement</h2>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'seat' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('seat')}
                >
                  Seat
                </Button>
              </div>
            </div>

            {/* Canvas area */}
            <div
              className={`min-h-[300px] bg-accent/10 rounded-lg p-3 ${
                viewMode === 'table'
                  ? 'grid gap-3 items-start content-start grid-cols-2'
                  : 'flex flex-wrap gap-3 items-start content-start'
              }`}
              aria-label="Seating Plan Canvas"
            >
              {viewMode === 'table' ? (
                // Table view - compact layout
                tables.map((table: any) => (
                  <DroppableTable
                    key={table.id}
                    table={table}
                    assignedGuests={tableGuests[table.id] || []}
                    activeId={activeId}
                  />
                ))
              ) : (
                // Seat view - more space for seat arrangements
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
        </div>

        {/* Summary Panel */}
        <div
          ref={(el) => { panelRefs.current.summary = el; }}
          className={`${activePanel === 'summary' ? 'block' : 'hidden'} transition-opacity duration-300 overflow-y-auto max-h-[calc(100vh-8rem)]`}
          role="tabpanel"
          aria-label="Summary panel"
        >
          <PlanSummary
            optimizationScore={planSummary.optimizationScore}
            totalGuests={planSummary.totalGuests}
            assigned={planSummary.assigned}
            unassigned={planSummary.unassigned}
            warnings={planSummary.warnings}
          />
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation activePanel={activePanel} onPanelChange={handlePanelChange} />
      </div>

      {/* Custom drag overlay that follows cursor exactly */}
      {activeGuest && (
        <div
          className="fixed pointer-events-none z-[9999] shadow-xl rounded-lg bg-white border-2 border-primary px-3 py-2"
          style={{
            left: mousePosRef.current.x + 12,
            top: mousePosRef.current.y + 12
          }}
        >
          <span className="font-semibold text-sm whitespace-nowrap">{activeGuest.name}</span>
        </div>
      )}
    </DndContext>
  );
}

function DroppableTable({ table, assignedGuests, activeId }: { table: any; assignedGuests: Array<{ guest: any; assignment: any }>; activeId: number | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const filledCount = assignedGuests.length;
  const emptyCount = table.capacity - filledCount;

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-3 transition-all duration-150 bg-white ${
        isOver ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border/60'
      }`}
      aria-label={`Table ${table.name}`}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
        <span className="font-semibold text-sm">{table.name}</span>
        <span className="text-xs text-muted-foreground">{filledCount}/{table.capacity}</span>
      </div>

      {/* Guests grid - compact */}
      <div className="flex flex-wrap gap-1">
        {assignedGuests.map(({ guest, assignment }) => (
          <DraggableGuestChip key={guest.id} guest={guest} />
        ))}
        {/* Empty slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-6 w-6 rounded border border-dashed border-border/40 bg-accent/5"
          />
        ))}
      </div>
    </div>
  );
}

function DraggableGuestChip({ guest }: { guest: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  // Get initials or first name
  const displayName = guest.name.split(' ')[0];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded cursor-grab active:cursor-grabbing hover:bg-primary/20 transition-colors"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={guest.name}
    >
      {displayName}
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
