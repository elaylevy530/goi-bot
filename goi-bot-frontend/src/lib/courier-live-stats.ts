export type LiveStatOutcome = {
  delivered_at?: string | null;
  was_cancelled?: boolean | null;
  customer_rating?: unknown;
};

export function isCompletedDelivery(o: LiveStatOutcome) {
  return !!o.delivered_at && o.was_cancelled !== true;
}

export function ratingValue(o: LiveStatOutcome) {
  if (!isCompletedDelivery(o)) return null;
  const n = Number(o.customer_rating);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function summarizeCourierLiveStats(
  rows: LiveStatOutcome[],
  fallbackAvg: number | null = null,
  now = new Date(),
) {
  const ratings = rows.map(ratingValue).filter((n): n is number => n != null);
  const liveAvg = ratings.length
    ? ratings.reduce((sum, n) => sum + n, 0) / ratings.length
    : null;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const deliveriesThisMonth = rows.filter((o) => {
    if (!isCompletedDelivery(o) || !o.delivered_at) return false;
    const at = new Date(o.delivered_at);
    return at >= monthStart && at <= now;
  }).length;
  return {
    avgRating: liveAvg ?? (Number.isFinite(fallbackAvg as number) ? fallbackAvg : null),
    ratingCount: ratings.length,
    deliveriesThisMonth,
    monthLabel: now.toLocaleDateString("he-IL", { month: "long" }),
  };
}
