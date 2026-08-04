import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushBatch } from "./send.server";

type StatusKey =
  | "assigned"
  | "heading_to_pickup"
  | "picked_up"
  | "delivered";

const TITLES: Record<StatusKey, string> = {
  assigned: "✅ שליח אישר את המשלוח",
  heading_to_pickup: "🚀 השליח יצא לאיסוף",
  picked_up: "📦 השליח אסף את המשלוח",
  delivered: "🎉 המשלוח נמסר",
};

export async function notifyBusinessJobStatus(jobId: string, status: string) {
  if (!(status in TITLES)) return { sent: 0, expired: 0 };
  const key = status as StatusKey;

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, job_number, customer_id, pickup_area, pickup_address, dropoff_area, dropoff_address, selected_courier_id",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!job?.customer_id) return { sent: 0, expired: 0 };

  let courierName = "";
  if (job.selected_courier_id) {
    const { data: c } = await supabaseAdmin
      .from("couriers")
      .select("full_name")
      .eq("id", job.selected_courier_id)
      .maybeSingle();
    courierName = c?.full_name ?? "";
  }

  const { data: subs } = await supabaseAdmin
    .from("business_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("business_id", job.customer_id);
  if (!subs?.length) return { sent: 0, expired: 0 };

  const jobLabel = job.job_number ? `#${job.job_number}` : "";
  const from = String(job.pickup_area || job.pickup_address || "").split(",")[0].trim();
  const to = String(job.dropoff_area || job.dropoff_address || "").split(",")[0].trim();
  const route = from && to ? `${from} → ${to}` : from || to || "";

  const body = [
    courierName ? `שליח: ${courierName}` : "",
    route,
  ]
    .filter(Boolean)
    .join(" · ");

  const results = await sendPushBatch(subs as never, {
    title: `${TITLES[key]} ${jobLabel}`.trim(),
    body: body || " ",
    url: `/business/order/${job.id}`,
    tag: `goi-job-${job.id}-${key}`,
  });

  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (gone.length) {
    await supabaseAdmin
      .from("business_push_subscriptions")
      .delete()
      .in("endpoint", gone);
  }
  return {
    sent: results.filter((r) => r.ok).length,
    expired: gone.length,
  };
}
