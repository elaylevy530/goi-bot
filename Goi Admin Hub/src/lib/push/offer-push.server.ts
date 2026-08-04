import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushBatch } from "./send.server";

type OfferPushJob = {
  id: string;
  job_number?: string | null;
  job_type?: string | null;
  package_type?: string | null;
  item_category?: string | null;
  pickup_area?: string | null;
  pickup_address?: string | null;
  dropoff_area?: string | null;
  dropoff_address?: string | null;
  payment?: number | string | null;
  customer_price?: number | string | null;
  suggested_courier_payment?: number | string | null;
  estimated_distance_km?: number | string | null;
};

function shortPlace(area?: string | null, address?: string | null) {
  return String(area || address || "—").split(",")[0].trim() || "—";
}

function money(job: OfferPushJob) {
  return job.payment || job.suggested_courier_payment || job.customer_price || "";
}

function packageLabel(job: OfferPushJob) {
  return job.item_category || job.package_type || job.job_type || "משלוח";
}

export async function sendOfferPushToCouriers(
  job: OfferPushJob,
  courierIds: string[],
  opts: { titlePrefix?: string } = {},
) {
  const ids = Array.from(new Set(courierIds.filter(Boolean)));
  if (!job?.id || ids.length === 0) return { sent: 0, expired: 0 };

  const { data: subs, error } = await supabaseAdmin
    .from("courier_push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("courier_id", ids);

  if (error) {
    console.error("[offer-push] subscription lookup failed:", error.message);
    return { sent: 0, expired: 0 };
  }
  if (!subs?.length) {
    console.log("[offer-push] no push subs for", ids.length, "couriers", { jobId: job.id });
    return { sent: 0, expired: 0 };
  }

  const price = money(job);
  const priceText = price ? `₪${price}` : "";
  const distText = job.estimated_distance_km ? `${Number(job.estimated_distance_km).toFixed(1)} ק״מ` : "";
  const body = [
    `📍 ${shortPlace(job.pickup_area, job.pickup_address)} → ${shortPlace(job.dropoff_area, job.dropoff_address)}`,
    [priceText, distText].filter(Boolean).join(" · "),
  ].filter(Boolean).join("\n");

  const titlePrefix = opts.titlePrefix ?? "🚚 משלוח חדש";
  const results = await sendPushBatch(subs as never, {
    title: `${titlePrefix} — ${packageLabel(job)}`,
    body,
    url: `/courier/new-jobs?jobId=${encodeURIComponent(job.id)}`,
    tag: `goi-offer-${job.id}`,
  });

  console.log("[offer-push] results:", results.map((r) => ({ status: r.status, gone: r.gone })), { jobId: job.id });

  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (gone.length) {
    await supabaseAdmin.from("courier_push_subscriptions").delete().in("endpoint", gone);
  }

  return {
    sent: results.filter((r) => r.ok).length,
    expired: gone.length,
  };
}