import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushBatch } from "./send.server";

type StatusKey =
  | "assigned"
  | "heading_to_pickup"
  | "picked_up"
  | "delivered";

const TITLES: Record<StatusKey, string> = {
  assigned: "✅ שליח אישר את המשלוח שלך",
  heading_to_pickup: "🚀 השליח בדרך לאיסוף",
  picked_up: "📦 השליח אסף את המשלוח",
  delivered: "🎉 המשלוח נמסר",
};

export async function notifyCustomerJobStatus(jobId: string, status: string) {
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

  // Resolve the private customer's auth user id from the customers row.
  const { data: cust } = await supabaseAdmin
    .from("customers")
    .select("user_id")
    .eq("id", job.customer_id)
    .maybeSingle();
  const userId = (cust as { user_id?: string } | null)?.user_id;
  if (!userId) return { sent: 0, expired: 0 };

  let courierName = "";
  if (job.selected_courier_id) {
    const { data: c } = await supabaseAdmin
      .from("couriers")
      .select("full_name")
      .eq("id", job.selected_courier_id)
      .maybeSingle();
    courierName = (c as { full_name?: string } | null)?.full_name ?? "";
  }

  const { data: subs } = await supabaseAdmin
    .from("customer_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
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
    url: `/customer/order/${job.id}`,
    tag: `goi-cust-job-${job.id}-${key}`,
  });

  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (gone.length) {
    await supabaseAdmin
      .from("customer_push_subscriptions")
      .delete()
      .in("endpoint", gone);
  }
  return {
    sent: results.filter((r) => r.ok).length,
    expired: gone.length,
  };
}
