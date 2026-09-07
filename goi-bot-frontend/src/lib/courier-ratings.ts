export type RatingJobRef = {
  customer_name?: string | null;
  pickup_area?: string | null;
  dropoff_area?: string | null;
  accepted_at?: string | null;
  heading_to_pickup_at?: string | null;
  arrived_at_pickup_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
};

export type RatingOutcome = {
  delivered_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  picked_up_at?: string | null;
  was_cancelled?: boolean | null;
  was_late?: boolean | null;
  customer_rating?: number | null;
  customer_comment?: string | null;
  jobs?: RatingJobRef | null;
};

export function minutesBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 60_000;
}

export function pickupMins(o: RatingOutcome) {
  const start = o.jobs?.heading_to_pickup_at || o.jobs?.accepted_at;
  const end = o.jobs?.arrived_at_pickup_at || o.jobs?.picked_up_at || o.picked_up_at;
  return minutesBetween(start, end);
}

export function deliveryMins(o: RatingOutcome) {
  const start = o.jobs?.picked_up_at || o.picked_up_at || o.jobs?.arrived_at_pickup_at;
  const end = o.jobs?.delivered_at || o.delivered_at;
  return minutesBetween(start, end);
}
