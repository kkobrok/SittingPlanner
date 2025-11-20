import React from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { GuestCard } from './GuestCard';

interface Seat {
  position: number;
  guest: any | null;
  assignment: any | null;
}

interface TableWithSeatsProps {
  table: any;
  seats: Seat[];
  onDropOnSeat: (guestId: number, tableId: number, seatPosition: number) => void;
  activeGuestId: number | null;
}

export function TableWithSeats({ table, seats, onDropOnSeat, activeGuestId }: TableWithSeatsProps) {
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
    // Round/oval tables need more space for circular seat arrangement
    const isCircular = tableType === 'round' || tableType === 'oval';

    // Scale based on capacity - circular tables get MUCH larger sizes for readability
    const sizeClass = isCircular
      ? (table.capacity <= 4 ? 'w-[600px]' :
         table.capacity <= 8 ? 'w-[800px]' :
         table.capacity <= 12 ? 'w-[1000px]' : 'w-[1200px]')
      : (table.capacity <= 4 ? 'max-w-[280px]' :
         table.capacity <= 8 ? 'max-w-[360px]' :
         table.capacity <= 12 ? 'max-w-[440px]' : 'max-w-[520px]');

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
        return `rounded-[20px_80px_20px_80px] ${sizeClass}`;
      case 'banquet':
        return `rounded-lg aspect-[3/1] ${sizeClass}`;
      default: // rectangle
        return `rounded-lg ${sizeClass}`;
    }
  };

  // Arrange seats realistically based on table shape
  const renderSeatsRealistic = () => {
    const capacity = table.capacity;

    switch (tableType) {
      case 'round':
      case 'oval': {
        // Seats arranged in a circle around the table
        return (
          <div className="relative" style={{ paddingTop: '100%' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full relative">
                {seats.map((seat, index) => {
                  const angle = (index / capacity) * 2 * Math.PI - Math.PI / 2;
                  const radius = 45; // percentage from center - increased for more space
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);
                  return (
                    <div
                      key={seat.position}
                      className="absolute"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '120px' // increased from 80px for better readability
                      }}
                    >
                      <DroppableSeat
                        tableId={table.id}
                        seat={seat}
                        onDrop={onDropOnSeat}
                        isActive={activeGuestId !== null}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'rectangle':
      case 'banquet': {
        // Seats on long sides
        const seatsPerSide = Math.ceil(capacity / 2);
        return (
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              {seats.slice(0, seatsPerSide).map((seat) => (
                <DroppableSeat
                  key={seat.position}
                  tableId={table.id}
                  seat={seat}
                  onDrop={onDropOnSeat}
                  isActive={activeGuestId !== null}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {seats.slice(seatsPerSide).map((seat) => (
                <DroppableSeat
                  key={seat.position}
                  tableId={table.id}
                  seat={seat}
                  onDrop={onDropOnSeat}
                  isActive={activeGuestId !== null}
                />
              ))}
            </div>
          </div>
        );
      }

      case 'square': {
        // Seats on all 4 sides
        const seatsPerSide = Math.ceil(capacity / 4);
        return (
          <div className="relative" style={{ paddingTop: '100%' }}>
            <div className="absolute inset-0">
              {seats.map((seat, index) => {
                const side = Math.floor(index / seatsPerSide);
                const posInSide = index % seatsPerSide;
                const totalInSide = Math.min(seatsPerSide, capacity - side * seatsPerSide);
                const offset = (posInSide + 1) / (totalInSide + 1) * 100;

                let style: React.CSSProperties = { position: 'absolute', width: '70px' };
                if (side === 0) { // top
                  style = { ...style, top: '0', left: `${offset}%`, transform: 'translateX(-50%)' };
                } else if (side === 1) { // right
                  style = { ...style, right: '0', top: `${offset}%`, transform: 'translateY(-50%)' };
                } else if (side === 2) { // bottom
                  style = { ...style, bottom: '0', left: `${offset}%`, transform: 'translateX(-50%)' };
                } else { // left
                  style = { ...style, left: '0', top: `${offset}%`, transform: 'translateY(-50%)' };
                }

                return (
                  <div key={seat.position} style={style}>
                    <DroppableSeat
                      tableId={table.id}
                      seat={seat}
                      onDrop={onDropOnSeat}
                      isActive={activeGuestId !== null}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'u_shape': {
        // Seats on 3 sides forming U: left arm, bottom, right arm
        const leftSeats = Math.ceil(capacity / 3);
        const bottomSeats = Math.ceil(capacity / 3);
        const rightSeats = capacity - leftSeats - bottomSeats;

        return (
          <div className="flex flex-col gap-2">
            {/* Top row: left and right arms */}
            <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
              {/* Left arm */}
              <div className="flex flex-col gap-2">
                {seats.slice(0, leftSeats).map((seat) => (
                  <DroppableSeat
                    key={seat.position}
                    tableId={table.id}
                    seat={seat}
                    onDrop={onDropOnSeat}
                    isActive={activeGuestId !== null}
                  />
                ))}
              </div>

              {/* Empty middle (inside of U) */}
              <div className="border-2 border-dashed border-border/30 rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground/50">U-Shape</span>
              </div>

              {/* Right arm */}
              <div className="flex flex-col gap-2">
                {seats.slice(leftSeats + bottomSeats, capacity).map((seat) => (
                  <DroppableSeat
                    key={seat.position}
                    tableId={table.id}
                    seat={seat}
                    onDrop={onDropOnSeat}
                    isActive={activeGuestId !== null}
                  />
                ))}
              </div>
            </div>

            {/* Bottom row: connecting base of U */}
            <div className="grid grid-cols-3 gap-2">
              {seats.slice(leftSeats, leftSeats + bottomSeats).map((seat) => (
                <DroppableSeat
                  key={seat.position}
                  tableId={table.id}
                  seat={seat}
                  onDrop={onDropOnSeat}
                  isActive={activeGuestId !== null}
                />
              ))}
            </div>
          </div>
        );
      }

      default: {
        // Wave or default: 2 columns
        return (
          <div className="grid grid-cols-2 gap-2">
            {seats.map((seat) => (
              <DroppableSeat
                key={seat.position}
                tableId={table.id}
                seat={seat}
                onDrop={onDropOnSeat}
                isActive={activeGuestId !== null}
              />
            ))}
          </div>
        );
      }
    }
  };

  return (
    <div className={`border border-border/60 p-4 mb-2 bg-card ${getTableShapeClasses()}`}>
      <div className="font-semibold text-base mb-3 tracking-tight flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="text-xl" title={tableType}>
            {icon}
          </span>
          {table.name}{' '}
          <span className="text-sm text-muted-foreground">(cap: {table.capacity})</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {seats.filter(s => s.guest).length}/{table.capacity} filled
        </span>
      </div>

      <div className="p-2">
        {renderSeatsRealistic()}
      </div>
    </div>
  );
}

interface DroppableSeatProps {
  tableId: number;
  seat: Seat;
  onDrop: (guestId: number, tableId: number, seatPosition: number) => void;
  isActive: boolean;
}

function DroppableSeat({ tableId, seat, onDrop, isActive }: DroppableSeatProps) {
  const dropId = `seat-${tableId}-${seat.position}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const isEmpty = !seat.guest;
  const canDrop = isEmpty || isActive;

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[80px] rounded-lg border-2 transition-all duration-150
        ${isEmpty
          ? 'border-dashed border-border/40 bg-accent/10'
          : 'border-border/60 bg-card/50'
        }
        ${isOver && canDrop
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : ''
        }
        ${!isEmpty && isOver && isActive
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
          : ''
        }
        flex flex-col gap-1.5 p-2.5
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Seat {seat.position}
        </span>
        {isEmpty && isActive && (
          <span className="text-xs text-primary">Drop here</span>
        )}
      </div>

      {seat.guest && (
        <div className="flex-1">
          <DraggableGuestInSeat guest={seat.guest} seatPosition={seat.position} />
        </div>
      )}

      {isEmpty && !isActive && (
        <div className="flex items-center justify-center py-2">
          <span className="text-sm text-muted-foreground/50">Empty</span>
        </div>
      )}
    </div>
  );
}

interface DraggableGuestInSeatProps {
  guest: any;
  seatPosition: number;
}

function DraggableGuestInSeat({ guest, seatPosition }: DraggableGuestInSeatProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <GuestCard guest={guest} seatPosition={seatPosition} />
    </div>
  );
}
