/* eslint-disable @typescript-eslint/no-explicit-any */
import { useDroppable, useDraggable } from "@dnd-kit/core";

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

export function TableWithSeats({ table, seats, onDropOnSeat: _onDropOnSeat, activeGuestId }: TableWithSeatsProps) {
  const filledCount = seats.filter((s) => s.guest).length;
  const tableType = table.table_type || "rectangle";

  // Calculate size based on FULL CAPACITY to prevent layout shifts
  // Must match the values in SeatsArrangement
  const isRound = tableType === "round" || tableType === "oval";
  const seatWidth = 55;
  const seatHeight = 24;
  const gap = 4;
  // Use table.capacity instead of seats.length for consistent sizing
  const maxSeats = table.capacity || seats.length;
  const circumference = maxSeats * (seatWidth + gap);
  const radius = Math.max(circumference / (2 * Math.PI), 35);
  const containerSize = radius * 2 + seatHeight + 16;

  return (
    <div
      className="border rounded-lg p-3 bg-white border-border/60"
      style={isRound ? { minHeight: containerSize + 50, minWidth: containerSize + 24 } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
        <span className="font-semibold text-sm">{table.name}</span>
        <span className="text-xs text-muted-foreground">
          {filledCount}/{table.capacity}
        </span>
      </div>

      {/* Realistic seat arrangement */}
      <SeatsArrangement
        tableType={tableType}
        seats={seats}
        tableId={table.id}
        activeGuestId={activeGuestId}
        capacity={table.capacity}
      />
    </div>
  );
}

interface SeatsArrangementProps {
  tableType: string;
  seats: Seat[];
  tableId: number;
  activeGuestId: number | null;
  capacity: number;
}

function SeatsArrangement({ tableType, seats, tableId, activeGuestId, capacity }: SeatsArrangementProps) {
  const isActive = activeGuestId !== null;
  // Use capacity for sizing to prevent layout shifts
  const maxSeats = capacity || seats.length;

  // Round/oval table - circular arrangement
  if (tableType === "round" || tableType === "oval") {
    // Calculate size based on FULL CAPACITY
    const seatWidth = 55;
    const seatHeight = 24;
    const gap = 4;
    // Calculate radius so seats fit around the circle
    const circumference = maxSeats * (seatWidth + gap);
    const radius = Math.max(circumference / (2 * Math.PI), 35);
    // Container size = diameter + seat height on each side + padding
    const containerSize = radius * 2 + seatHeight + 16;
    const center = containerSize / 2;
    // Table center radius (smaller than seat radius)
    const tableRadius = radius - 10;

    return (
      <div className="relative mx-auto" style={{ width: containerSize, height: containerSize }}>
        {/* Table center */}
        <div
          className="absolute rounded-full bg-accent/20 border border-border/40"
          style={{
            left: center - tableRadius,
            top: center - tableRadius,
            width: tableRadius * 2,
            height: tableRadius * 2,
          }}
        />
        {/* Seats around - use maxSeats for consistent positioning */}
        {seats.map((seat, i) => {
          const angle = (i / maxSeats) * 2 * Math.PI - Math.PI / 2;
          const x = center + radius * Math.cos(angle) - seatWidth / 2;
          const y = center + radius * Math.sin(angle) - seatHeight / 2;
          return (
            <div
              key={seat.position}
              className="absolute"
              style={{ left: x, top: y, width: seatWidth, height: seatHeight }}
            >
              <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
            </div>
          );
        })}
      </div>
    );
  }

  // Rectangle/banquet - seats on two long sides
  if (tableType === "rectangle" || tableType === "banquet") {
    const half = Math.ceil(maxSeats / 2);
    const topSeats = seats.slice(0, half);
    const bottomSeats = seats.slice(half);
    // Calculate width based on capacity
    const seatWidth = 60;
    const gap = 4;
    const minWidth = half * (seatWidth + gap);

    return (
      <div className="flex flex-col gap-1" style={{ minWidth }}>
        {/* Top row */}
        <div className="flex justify-center gap-1">
          {topSeats.map((seat) => (
            <div key={seat.position} style={{ width: seatWidth, height: 28 }}>
              <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
            </div>
          ))}
        </div>
        {/* Table */}
        <div className="h-8 mx-2 rounded bg-accent/20 border border-border/40" />
        {/* Bottom row */}
        <div className="flex justify-center gap-1">
          {bottomSeats.map((seat) => (
            <div key={seat.position} style={{ width: seatWidth, height: 28 }}>
              <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Square - seats on all 4 sides
  if (tableType === "square") {
    const perSide = Math.ceil(maxSeats / 4);
    const top = seats.slice(0, perSide);
    const right = seats.slice(perSide, perSide * 2);
    const bottom = seats.slice(perSide * 2, perSide * 3);
    const left = seats.slice(perSide * 3);
    // Calculate size based on capacity
    const seatWidth = 60;
    const seatHeight = 28;
    const gap = 4;
    const sideSize = perSide * (seatWidth + gap);
    const tableSize = 64; // w-16 = 64px
    const minSize = sideSize + tableSize + seatWidth * 2 + gap * 4;

    const SeatBox = ({ seat }: { seat: Seat }) => (
      <div style={{ width: seatWidth, height: seatHeight }}>
        <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
      </div>
    );

    return (
      <div className="flex flex-col gap-1 items-center" style={{ minWidth: minSize }}>
        {/* Top */}
        <div className="flex gap-1">
          {top.map((s) => (
            <SeatBox key={s.position} seat={s} />
          ))}
        </div>
        {/* Middle: left + table + right */}
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-1">
            {left.map((s) => (
              <SeatBox key={s.position} seat={s} />
            ))}
          </div>
          <div className="w-16 h-16 rounded bg-accent/20 border border-border/40" />
          <div className="flex flex-col gap-1">
            {right.map((s) => (
              <SeatBox key={s.position} seat={s} />
            ))}
          </div>
        </div>
        {/* Bottom */}
        <div className="flex gap-1">
          {bottom.map((s) => (
            <SeatBox key={s.position} seat={s} />
          ))}
        </div>
      </div>
    );
  }

  // U-shape - 3 sides
  if (tableType === "u_shape") {
    const third = Math.ceil(maxSeats / 3);
    const left = seats.slice(0, third);
    const bottom = seats.slice(third, third * 2);
    const right = seats.slice(third * 2);
    // Calculate size based on capacity
    const seatWidth = 60;
    const seatHeight = 28;
    const gap = 4;
    const bottomWidth = third * (seatWidth + gap);
    const minWidth = bottomWidth + seatWidth * 2 + gap * 2;

    const SeatBox = ({ seat }: { seat: Seat }) => (
      <div style={{ width: seatWidth, height: seatHeight }}>
        <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
      </div>
    );

    return (
      <div className="flex flex-col gap-1" style={{ minWidth }}>
        {/* Top: left + space + right */}
        <div className="flex gap-1 justify-between">
          <div className="flex flex-col gap-1">
            {left.map((s) => (
              <SeatBox key={s.position} seat={s} />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {right.map((s) => (
              <SeatBox key={s.position} seat={s} />
            ))}
          </div>
        </div>
        {/* U-shape table body */}
        <div className="flex gap-1">
          <div className="w-12 h-6 rounded-l bg-accent/20 border border-border/40 border-r-0" />
          <div className="flex-1" />
          <div className="w-12 h-6 rounded-r bg-accent/20 border border-border/40 border-l-0" />
        </div>
        {/* Bottom connecting seats */}
        <div className="flex justify-center gap-1">
          {bottom.map((s) => (
            <SeatBox key={s.position} seat={s} />
          ))}
        </div>
        <div className="h-4 mx-6 rounded-b bg-accent/20 border border-border/40 border-t-0" />
      </div>
    );
  }

  // Default fallback - 2 column grid
  const seatWidth = 60;
  const seatHeight = 28;
  const gap = 4;
  const cols = 2;
  const rows = Math.ceil(maxSeats / cols);
  const minWidth = cols * (seatWidth + gap);
  const minHeight = rows * (seatHeight + gap);

  return (
    <div className="grid grid-cols-2 gap-1" style={{ minWidth, minHeight }}>
      {seats.map((seat) => (
        <div key={seat.position} style={{ width: seatWidth, height: seatHeight }}>
          <SeatSlotWithName seat={seat} tableId={tableId} isActive={isActive} />
        </div>
      ))}
    </div>
  );
}

interface SeatSlotProps {
  seat: Seat;
  tableId: number;
  isActive: boolean;
}

function SeatSlotWithName({ seat, tableId, isActive: _isActive }: SeatSlotProps) {
  const dropId = `seat-${tableId}-${seat.position}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  const isEmpty = !seat.guest;

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full h-full rounded border text-center flex items-center justify-center px-1
        ${isEmpty ? "border-dashed border-border/40 bg-accent/5" : "border-border/60 bg-white"}
        ${isOver ? "border-primary bg-primary/10 ring-1 ring-primary/30" : ""}
      `}
      title={seat.guest?.name || `Seat ${seat.position}`}
    >
      {seat.guest ? (
        <DraggableGuestWithName guest={seat.guest} />
      ) : (
        <span className="text-[9px] text-muted-foreground/50">{seat.position}</span>
      )}
    </div>
  );
}

function DraggableGuestWithName({ guest }: { guest: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  // First name + first letter of surname
  const parts = guest.name.split(" ");
  const displayName = parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="w-full h-full flex items-center justify-center text-[10px] font-medium text-primary cursor-grab active:cursor-grabbing truncate"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      title={guest.name}
    >
      {displayName}
    </div>
  );
}
