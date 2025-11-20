import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GenerateSeatingPlanRequestDto, ValidateAssignmentImpactRequestDto } from "../../types";

const API_BASE = "/api";

export function useSeatingData(eventId: string) {
  const q = useQuery<{ guests: unknown; tables: unknown; assignments: unknown }>({
    queryKey: ["seating", eventId],
    queryFn: async () => {
      const [gRes, tRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/events/${eventId}/guests`),
        fetch(`${API_BASE}/events/${eventId}/tables`),
        fetch(`${API_BASE}/events/${eventId}/assignments`),
      ]);
      if (!gRes.ok || !tRes.ok || !aRes.ok) throw new Error("Failed to load seating data");
      return {
        guests: await gRes.json(),
        tables: await tRes.json(),
        assignments: await aRes.json(),
      };
    },
  });

  interface AssignmentDto {
    id: number;
    event_id: number;
    guest: { id: number; name: string };
    table: { id: number; name: string };
    seat_position?: number | null;
  }

  interface SeatingFetchResult {
    guests?: { data?: unknown[] };
    tables?: { data?: unknown[] };
    assignments?: { data?: AssignmentDto[] };
  }
  const raw = q.data as SeatingFetchResult | undefined;
  const guests = raw?.guests?.data ?? [];
  const tables = raw?.tables?.data ?? [];

  // Transform assignments from nested structure to flat structure
  const assignments = (raw?.assignments?.data ?? []).map((a: AssignmentDto) => ({
    id: a.id,
    event_id: a.event_id,
    guest_id: a.guest.id,
    table_id: a.table.id,
    seat_position: a.seat_position,
  }));

  return { guests, tables, assignments, isLoading: q.isLoading, refetch: q.refetch };
}

export function useGeneratePlan(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (options: GenerateSeatingPlanRequestDto) => {
      const res = await fetch(`${API_BASE}/events/${eventId}/seating-plans/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error("Generate failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seating", eventId] }),
  });
}

export function useValidateChange(eventId: string) {
  return useMutation({
    mutationFn: async (payload: ValidateAssignmentImpactRequestDto) => {
      const res = await fetch(`${API_BASE}/events/${eventId}/seating-plans/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Validation failed");
      return res.json();
    },
  });
}
