import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAssignmentMutations(eventId: string) {
  const qc = useQueryClient();
  // PATCH /api/assignments/{id}

  const updateAssignment = useMutation({
    mutationFn: async ({
      assignmentId,
      tableId,
      seatPosition,
    }: {
      assignmentId: number;
      tableId?: number;
      seatPosition?: number | null;
    }) => {
      const body: { table_id?: number; seat_position?: number | null } = {};
      if (tableId !== undefined) body.table_id = tableId;
      if (seatPosition !== undefined) body.seat_position = seatPosition;

      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update assignment");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
  });

  // POST /api/events/{id}/assignments
  const createAssignment = useMutation({
    mutationFn: async ({
      guestId,
      tableId,
      seatPosition,
    }: {
      guestId: number;
      tableId: number;
      seatPosition?: number | null;
    }) => {
      const body: { guest_id: number; table_id: number; seat_position?: number | null } = {
        guest_id: guestId,
        table_id: tableId,
      };
      if (seatPosition !== undefined) body.seat_position = seatPosition;

      const res = await fetch(`/api/events/${eventId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create assignment");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
  });

  // DELETE /api/assignments/{id}
  const deleteAssignment = useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: number }) => {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete assignment");
      return null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
  });

  return { updateAssignment, createAssignment, deleteAssignment };
}
