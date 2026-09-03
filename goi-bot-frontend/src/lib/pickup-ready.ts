/** Live label for when a business order will be ready for pickup. */

export type PickupReadyFields = {
  pickup_ready?: boolean | null;
  pickup_ready_at?: string | Date | null;
};

export function pickupReadyMinutesLeft(
  job: PickupReadyFields,
  nowMs: number = Date.now(),
): number | null {
  if (job.pickup_ready) return 0;
  if (!job.pickup_ready_at) return null;
  const at = new Date(job.pickup_ready_at).getTime();
  if (!Number.isFinite(at)) return null;
  const mins = Math.ceil((at - nowMs) / 60_000);
  return mins <= 0 ? 0 : mins;
}

/** Short badge text: "מוכנה בעוד 12 דק'" / "מוכנה לאיסוף" */
export function pickupReadyBadge(job: PickupReadyFields, nowMs: number = Date.now()): string | null {
  const mins = pickupReadyMinutesLeft(job, nowMs);
  if (mins === null) return null;
  if (mins === 0) return "מוכנה לאיסוף";
  return `מוכנה בעוד ${mins} דק׳`;
}

/** Map callout: "מוכנה לאיסוף בעוד 12 דק'" */
export function pickupReadyMapLabel(job: PickupReadyFields, nowMs: number = Date.now()): string | null {
  const mins = pickupReadyMinutesLeft(job, nowMs);
  if (mins === null) return null;
  if (mins === 0) return "מוכנה לאיסוף";
  return `מוכנה לאיסוף בעוד ${mins} דק׳`;
}
