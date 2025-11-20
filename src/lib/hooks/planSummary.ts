import { useQuery } from '@tanstack/react-query';
import type { GetSeatingPlanResponseDto } from '../../types';

const API_BASE = '/api';

export function usePlanSummary(eventId: string) {
  return useQuery({
    queryKey: ['planSummary', eventId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/seating-plans/current-event-${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch plan summary');
      const data: GetSeatingPlanResponseDto = await res.json();
      return {
        optimizationScore: data.optimization_score,
        totalGuests: data.statistics.total_guests,
        assigned: data.statistics.assigned,
        unassigned: data.statistics.unassigned,
        warnings: data.warnings ?? [],
      };
    },
  });
}
