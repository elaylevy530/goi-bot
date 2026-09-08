import { useQuery } from "@tanstack/react-query";
import { nestGetMyCourierStats, nestListMyCourierOutcomes } from "@/lib/nest-domain";
import { summarizeCourierLiveStats, type LiveStatOutcome } from "@/lib/courier-live-stats";

export function useMyCourierLiveStats(courierId?: string) {
  const statsQ = useQuery({
    queryKey: ["courier-ratings-stats", courierId],
    enabled: !!courierId,
    queryFn: () => nestGetMyCourierStats(),
  });

  const outcomesQ = useQuery({
    queryKey: ["courier-ratings-outcomes", courierId],
    enabled: !!courierId,
    refetchInterval: 60_000,
    queryFn: () => nestListMyCourierOutcomes() as Promise<LiveStatOutcome[]>,
  });

  const fallbackAvg = statsQ.data?.avg_rating != null ? Number(statsQ.data.avg_rating) : null;
  const summarized = summarizeCourierLiveStats(outcomesQ.data ?? [], fallbackAvg);

  return {
    ...summarized,
    isLoading: !!courierId && outcomesQ.isLoading && !outcomesQ.data,
  };
}
