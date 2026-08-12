import { nestServerFetch } from "@/lib/nest-server";

type QueueItem = {
  recipient_phone: string;
  recipient_courier_id?: string | null;
  recipient_business_id?: string | null;
  job_id?: string | null;
  message_type: "text" | "buttons" | "template";
  body?: string | null;
  buttons?: Array<{ buttonId: string; buttonText: string }> | null;
  template_name?: string | null;
  template_params?: string[] | null;
};

/** Enqueue is Nest-owned; shell callers should use Nest WhatsApp send/dispatch. */
export async function enqueueWhatsApp(_item: QueueItem) {
  console.warn("enqueueWhatsApp: no-op — use Nest /api/whatsapp/send or dispatchJob");
  return { ok: false as const, skipped: "owned_by_nest" };
}

export async function drainNotificationQueue(maxItems = 25): Promise<{ processed: number; sent: number; failed: number; dead: number }> {
  return nestServerFetch("/api/public/notification-queue-worker", {
    method: "POST",
    body: { maxItems },
    cronSecret: true,
  });
}
