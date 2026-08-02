/**
 * Courier offer push fan-out is owned by Nest
 * (`JobsService.dispatchJob` → `OfferPushService.notifyCouriers`).
 */
export async function sendOfferPushToCouriers(..._args: unknown[]) {
  console.warn(
    "sendOfferPushToCouriers: no-op — Nest dispatchJob owns offer push fan-out",
  );
  return { sent: 0, expired: 0, skipped: "owned_by_nest_dispatch" };
}
