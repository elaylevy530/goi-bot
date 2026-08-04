/**
 * Notification queue with exponential backoff.
 *
 * Use `enqueueWhatsApp()` instead of calling sendText/sendButtons directly
 * for any message that MUST be delivered (job offers, status updates).
 * The worker (`/api/public/notification-queue-worker`) drains the queue and
 * applies exponential backoff on transient failures.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export async function enqueueWhatsApp(item: QueueItem) {
  const { error } = await supabaseAdmin
    .from("notification_queue")
    .insert({
      ...item,
      buttons: item.buttons ?? null,
      template_params: item.template_params ?? null,
      status: "queued",
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
    } as never);
  if (error) console.error("[notif-queue] enqueue failed:", error.message);
}

function backoffSeconds(attempt: number): number {
  // 30s, 2m, 8m, 32m, 2h
  return Math.min(60 * 60 * 2, 30 * Math.pow(4, attempt));
}

export async function drainNotificationQueue(maxItems = 25): Promise<{ processed: number; sent: number; failed: number; dead: number }> {
  const { data: items, error } = await supabaseAdmin
    .from("notification_queue")
    .select("*")
    .eq("status", "queued")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(maxItems);
  if (error) {
    console.error("[notif-queue] drain failed:", error.message);
    return { processed: 0, sent: 0, failed: 0, dead: 0 };
  }
  if (!items || items.length === 0) return { processed: 0, sent: 0, failed: 0, dead: 0 };

  const { sendText, sendButtons, getActiveProvider } = await import("./provider.server");

  let sent = 0;
  let failed = 0;
  let dead = 0;

  for (const it of items as Array<Record<string, unknown>>) {
    const id = it.id as string;
    // claim
    const { error: claimErr } = await supabaseAdmin
      .from("notification_queue")
      .update({ status: "sending" } as never)
      .eq("id", id)
      .eq("status", "queued");
    if (claimErr) continue;

    try {
      let result: any;
      const phone = it.recipient_phone as string;
      if (it.message_type === "text") {
        result = await sendText(phone, (it.body as string) ?? "");
      } else if (it.message_type === "buttons") {
        result = await sendButtons(phone, (it.body as string) ?? "", (it.buttons as any) ?? []);
      } else {
        // template — Cloud only; fall back to text body on Green
        if (getActiveProvider() === "cloud") {
          const { cloudSendTemplate } = await import("./cloud-api.server");
          result = await cloudSendTemplate(
            phone,
            (it.template_name as string) ?? "",
            "he",
            ((it.template_params as string[]) ?? []),
          );
        } else {
          result = await sendText(phone, (it.body as string) ?? (it.template_name as string) ?? "");
        }
      }
      await supabaseAdmin
        .from("notification_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider: getActiveProvider(),
          external_message_id:
            (result && typeof result === "object" && "idMessage" in result
              ? String((result as { idMessage?: unknown }).idMessage ?? "")
              : (result?.messages?.[0]?.id ?? null)) || null,
        } as never)
        .eq("id", id);
      sent++;
    } catch (e) {
      const attempts = ((it.attempts as number) ?? 0) + 1;
      const max = (it.max_attempts as number) ?? 5;
      const isDead = attempts >= max;
      await supabaseAdmin
        .from("notification_queue")
        .update({
          status: isDead ? "dead" : "queued",
          attempts,
          last_error: (e as Error).message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString(),
        } as never)
        .eq("id", id);
      if (isDead) dead++;
      else failed++;
    }
  }
  return { processed: items.length, sent, failed, dead };
}
