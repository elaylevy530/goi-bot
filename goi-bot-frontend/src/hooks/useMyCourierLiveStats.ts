import { useQuery } from "@tanstack/react-query";
import { nestGetMyCourierStats, nestListMyCourierOutcomes } from "@/lib/nest-domain";

type OutcomeLite = {
  delivered_at?: string | null;
  was_cancelled?: boolean | null;
  customer_rating?: unknown;
};

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
    queryFn: () => nestListMyCourierOutcomes() as Promise<OutcomeLite[]>,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = now.toLocaleDateString("he-IL", { month: "long" });
  const rows = outcomesQ.data ?? [];

  const liveRatings = rows
    .filter((o) => o.delivered_at && !o.was_cancelled && o.customer_rating != null)
    .map((o) => Number(o.customer_rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  const liveAvg =
    liveRatings.length > 0
      ? liveRatings.reduce((sum, n) => sum + n, 0) / liveRatings.length
      : null;
  const statsAvg = statsQ.data?.avg_rating != null ? Number(statsQ.data.avg_rating) : null;
  const avgRating = liveAvg ?? (Number.isFinite(statsAvg as number) ? statsAvg : null);

  const deliveriesThisMonth = rows.filter((o) => {
    if (!o.delivered_at || o.was_cancelled) return false;
    const at = new Date(o.delivered_at);
    return at >= monthStart && at <= now;
  }).length;

  return {
    avgRating,
    ratingCount: liveRatings.length,
    deliveriesThisMonth,
    monthLabel,
    isLoading: (!!courierId && (statsQ.isLoading || outcomesQ.isLoading)),
  };
}
