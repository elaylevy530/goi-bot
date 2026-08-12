/**
 * WhatsApp group dispatch for new jobs is owned by Nest
 * (`JobsService.dispatchJob` → `WhatsappDispatchService.notifyJobDispatched`).
 * Callers should dispatch via `POST /api/jobs/:id/dispatch` (or guest confirm).
 */
export async function sendJobToWhatsAppGroup(..._args: unknown[]) {
  console.warn(
    "sendJobToWhatsAppGroup: no-op — Nest dispatchJob owns WhatsApp group fan-out",
  );
  return { ok: false as const, skipped: "owned_by_nest_dispatch" };
}

/** Job-taken group notice is owned by Nest dispatch/WhatsApp worker. */
export async function sendJobTakenToWhatsAppGroup(..._args: unknown[]) {
  console.warn(
    "sendJobTakenToWhatsAppGroup: no-op — Nest WhatsApp dispatch owns job-taken notices",
  );
  return { ok: false as const, skipped: "owned_by_nest_dispatch" };
}
