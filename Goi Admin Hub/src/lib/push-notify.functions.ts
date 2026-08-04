import { createServerFn } from "@tanstack/react-start";

/**
 * Fan-out a Web Push to one or more couriers.
 * Loads their saved subscriptions and sends an encrypted push with title/body/url.
 * Deletes endpoints that come back 404/410 (subscription expired).
 */
export const pushNotifyCouriers = createServerFn({ method: "POST" })
  .inputValidator((input: {
    courierIds: string[];
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  }) => input)
  .handler(async ({ data }): Promise<{ sent: number; expired: number }> => {
    if (!data.courierIds?.length) return { sent: 0, expired: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushBatch } = await import("./push/send.server");

    const { data: subs, error } = await supabaseAdmin
      .from("courier_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("courier_id", data.courierIds);
    if (error || !subs?.length) return { sent: 0, expired: 0 };

    const payload = {
      title: data.title ?? "Goi — משלוח חדש 🚚",
      body: data.body ?? "משלוח חדש זמין — הקש לצפייה",
      url: data.url ?? "/courier/new-jobs",
      tag: data.tag ?? "goi-offer",
    };

    const results = await sendPushBatch(subs as any, payload);
    const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (gone.length) {
      await supabaseAdmin.from("courier_push_subscriptions").delete().in("endpoint", gone);
    }
    const sent = results.filter((r) => r.ok).length;
    return { sent, expired: gone.length };
  });
