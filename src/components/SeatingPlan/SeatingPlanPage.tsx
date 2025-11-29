import React, { useState } from "react";
import { useSeatingData, useGeneratePlan, useValidateChange } from "../../lib/hooks/seating";
import { useAssignmentMutations } from "../../lib/hooks/assignmentMutations";
import { PlanToolbar } from "./PlanToolbar";
import { DragAndDropCanvas } from "./DragAndDropCanvas";
import { GenerationModal } from "./GenerationModal";
import { MoveGuestModal } from "./MoveGuestModal";
import { ConflictNotifier } from "./ConflictNotifier";
import {
  generateSeatingPlanPDF,
  generateSeatingPlanCSV,
  generateVisualSeatingPlanPDF,
  downloadPDF,
  downloadCSV,
} from "../../services/export.service";

export default function SeatingPlanPage({ eventId }: { eventId: string }) {
  // ...existing code...

  const { guests, tables, assignments, relationships, isLoading, refetch } = useSeatingData(eventId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [moveModalState, setMoveModalState] = useState<{ open: boolean; guest?: any }>({ open: false });
  const [validationResults, setValidationResults] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const generate = useGeneratePlan(eventId);
  const validate = useValidateChange(eventId);
  const { updateAssignment, createAssignment, deleteAssignment } = useAssignmentMutations(eventId);

  // Export handlers
  const getExportData = () => ({
    eventName: `Event ${eventId}`,
    tables: tables.map((t: any) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      table_type: t.table_type,
    })),
    guests: guests.map((g: any) => ({
      id: g.id,
      name: g.name,
      dietary_restrictions: g.dietary_restrictions,
    })),
    assignments: assignments.map((a: any) => ({
      guest_id: a.guest_id,
      table_id: a.table_id,
      seat_position: a.seat_position,
    })),
  });

  const handleExportPDF = () => {
    const doc = generateSeatingPlanPDF(getExportData());
    downloadPDF(doc, `seating-plan-${eventId}.pdf`);
    setShowExportMenu(false);
    setSuccessMessage("PDF exported successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportVisualPDF = (layout: "grid" | "single") => {
    const doc = generateVisualSeatingPlanPDF(getExportData(), { layout });
    downloadPDF(doc, `seating-plan-visual-${eventId}.pdf`);
    setShowExportMenu(false);
    setSuccessMessage(`Visual PDF (${layout}) exported successfully!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportCSV = () => {
    const csv = generateSeatingPlanCSV(getExportData());
    downloadCSV(csv, `seating-plan-${eventId}.csv`);
    setShowExportMenu(false);
    setSuccessMessage("CSV exported successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExportClick = () => {
    setShowExportMenu(!showExportMenu);
  };

  // Handle drop event with validation and conflict feedback
  const handleDrop = async (guestId: number, toTableId: number, seatPosition?: number) => {
    const assignment: any = assignments.find((a: any) => a.guest_id === guestId);
    const guest: any = guests.find((g: any) => g.id === guestId);
    const table: any = tables.find((t: any) => t.id === toTableId);

    const result = await (validate.mutateAsync as (vars: any) => Promise<any>)({
      changes: [{ guest_id: guestId, from_table_id: assignment?.table_id ?? null, to_table_id: toTableId }],
    });
    setValidationResults(result);
    if (!result?.conflicts?.length) {
      if (assignment && assignment.id != null) {
        // Update existing assignment (with optional seat position)
        await (updateAssignment.mutateAsync as (vars: any) => Promise<any>)({
          assignmentId: assignment.id,
          tableId: toTableId,
          seatPosition: seatPosition,
        });
      } else {
        // Create new assignment (with optional seat position)
        await (createAssignment.mutateAsync as (vars: any) => Promise<any>)({
          guestId,
          tableId: toTableId,
          seatPosition: seatPosition,
        });
      }
      // Show success message
      const seatInfo = seatPosition ? ` (Seat ${seatPosition})` : "";
      setSuccessMessage(`${guest?.name || "Guest"} assigned to ${table?.name || "table"}${seatInfo}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Handle unassigning a guest (dropping back to unassigned list)
  const handleUnassign = async (guestId: number) => {
    const assignment: any = assignments.find((a: any) => a.guest_id === guestId);
    const guest: any = guests.find((g: any) => g.id === guestId);

    if (assignment && assignment.id != null) {
      await (deleteAssignment.mutateAsync as (vars: any) => Promise<any>)({ assignmentId: assignment.id });
      setSuccessMessage(`${guest?.name || "Guest"} removed from table`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  function handleRevert() {
    setValidationResults(null);
    refetch();
  }

  function handleGenerateClick() {
    setShowGenerationModal(true);
  }
  function handleStartGeneration(options: any) {
    setIsGenerating(true);
    setShowGenerationModal(false);
    generate.mutate(options, {
      onSettled: () => setIsGenerating(false),
    });
  }

  // Calculate plan summary from existing data
  const assignedGuestIds = new Set(assignments.map((a: any) => a.guest_id));
  const unassignedGuests = guests.filter((g: any) => !assignedGuestIds.has(g.id));

  console.log("SeatingPlanPage - Data:", {
    guestsCount: guests.length,
    assignmentsCount: assignments.length,
    unassignedCount: unassignedGuests.length,
    guests,
    assignments,
  });

  const planSummary = {
    optimizationScore: 0, // Will be populated after AI generation
    totalGuests: guests.length,
    assigned: assignments.length,
    unassigned: unassignedGuests.length,
    warnings: [],
  };

  // Empty state guidance
  if (isLoading) {
    return <div className="p-6 text-center text-sm text-gray-600">Loading seating data...</div>;
  }
  if (!tables?.length || !guests?.length) {
    return (
      <div className="p-6 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Seating Plan</h1>
        <p className="text-gray-700 max-w-md mx-auto">
          {!tables?.length && !guests?.length && "No tables or guests yet."}
          {tables?.length && !guests?.length && "Tables exist but no guests added."}
          {!tables?.length && guests?.length && "Guests added but no tables yet."}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href={`/events/${eventId}/guests`}
            className="inline-flex items-center justify-center h-11 px-7 rounded-lg bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-sm)] hover:bg-primary/90 hover:shadow-[var(--shadow-md)] active:shadow-[var(--shadow-sm)] active:scale-[0.98] transition-all duration-150"
          >
            Manage Guests
          </a>
          <a
            href={`/events/${eventId}/tables`}
            className="inline-flex items-center justify-center h-11 px-7 rounded-lg bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-sm)] hover:bg-primary/90 hover:shadow-[var(--shadow-md)] active:shadow-[var(--shadow-sm)] active:scale-[0.98] transition-all duration-150"
          >
            Manage Tables
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Seating Plan</h1>
      </header>

      <div className="relative">
        <PlanToolbar
          isGenerating={isGenerating}
          disabled={isLoading || (tables?.length ?? 0) === 0 || (guests?.length ?? 0) === 0}
          onGenerateClick={handleGenerateClick}
          onExportClick={handleExportClick}
        />
        {showExportMenu && (
          <div className="absolute top-12 left-[120px] z-50 bg-white border border-border rounded-lg shadow-[var(--shadow-lg)] py-1 min-w-[180px]">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border">
              Visual (Graphic)
            </div>
            <button
              onClick={() => handleExportVisualPDF("grid")}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <span>🎨</span> Grid Layout (default)
            </button>
            <button
              onClick={() => handleExportVisualPDF("single")}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <span>🖼️</span> One Table Per Page
            </button>
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-t border-border mt-1">
              Data Export
            </div>
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <span>📄</span> Table List PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
            >
              <span>📊</span> CSV Spreadsheet
            </button>
          </div>
        )}
      </div>

      <GenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        onStart={handleStartGeneration}
      />

      <MoveGuestModal
        open={moveModalState.open}
        guest={moveModalState.guest}
        tables={tables}
        onConfirm={(tableId) => {
          if (moveModalState.guest) handleDrop(moveModalState.guest.id, tableId);
          setMoveModalState({ open: false });
        }}
        onClose={() => setMoveModalState({ open: false })}
      />

      <ConflictNotifier results={validationResults} onRevert={handleRevert} />

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full p-4">
          <div className="bg-primary/10 dark:bg-primary/20 backdrop-blur-md border-2 border-primary/40 rounded-xl p-4 shadow-[var(--shadow-lg)] animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div className="flex-1">
                <p className="font-semibold text-sm tracking-tight text-primary dark:text-primary-foreground">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main>
        <DragAndDropCanvas
          tables={tables}
          guests={guests}
          assignments={assignments}
          relationships={relationships}
          unassignedGuests={unassignedGuests}
          onDrop={handleDrop}
          onUnassign={handleUnassign}
          planSummary={planSummary}
        />
      </main>
    </div>
  );
}
