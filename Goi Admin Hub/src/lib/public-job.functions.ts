/**
 * Public (unauthenticated) job page functions.
 *
 * Used by /j/$id — the link that movers get in the WhatsApp group.
 * A mover can either take a fixed-price job or send a price offer with
 * their phone number. Every response is stored in public.job_leads and
 * pushed to the admin WhatsApp number configured in app_config
 * (key: admin_notify_phone) or the ADMIN_NOTIFY_PHONE env fallback.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicJob = {
  id: string;
  job_number: string | number | null;
  service_category: string | null;
  package_type: string | null;
  package_size: string | null;
  number_of_packages: number | null;
  description: string | null;
  pickup_area: string | null;
  pickup_address: string | null;
  dropoff_area: string | null;
  dropoff_address: string | null;
  job_date: string | null;
  job_time: string | null;
  estimated_distance_km: number | null;
  price: number | null;
  status: string | null;
  partner_name: string | null;
  partner_slug: string | null;
  taken: boolean;
};

/**
 * A public link stops accepting responses when:
 *  - a courier/mover was already selected by the admin, or
 *  - the job has a fixed price and someone already pressed "I take it".
 * Quote-request jobs keep accepting offers until the admin picks one.
 */
async function isJobTaken(db: any, j: any): Promise<boolean> {
  if (j.selected_courier_id) return true;
  if (j.pricing_type === "quote_request") return false;
  const { count } = await db
    .from("job_leads")
    .select("id", { count: "exact", head: true })
    .eq("job_id", j.id)
    .eq("kind", "take");
  return Number(count ?? 0) > 0;
}

export const getPublicJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(4).max(60) }).parse(d))
  .handler(async ({ data }): Promise<PublicJob | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, job_number, service_category, package_type, package_size, number_of_packages, description, pickup_area, pickup_address, dropoff_area, dropoff_address, job_date, job_time, estimated_distance_km, suggested_courier_payment, payment, pricing_type, status, selected_courier_id, partner_id",
      )
      .eq(isUuid ? "id" : ("short_code" as "id"), data.id)
      .maybeSingle();
    if (jobErr) console.error("[public-job] load failed", jobErr);
    if (!job) return null;


    let partner_name: string | null = null;
    let partner_slug: string | null = null;
    if ((job as any).partner_id) {
      const { data: p } = await supabaseAdmin
        .from("partners")
        .select("name, slug")
        .eq("id", (job as any).partner_id)
        .maybeSingle();
      partner_name = (p as any)?.name ?? null;
      partner_slug = (p as any)?.slug ?? null;
    }

    const j = job as any;
    return {
      id: j.id,
      job_number: j.job_number ?? null,
      service_category: j.service_category ?? null,
      package_type: j.package_type ?? null,
      package_size: j.package_size ?? null,
      number_of_packages: j.number_of_packages ?? null,
      description: j.description ?? null,
      pickup_area: j.pickup_area ?? null,
      pickup_address: j.pickup_address ?? null,
      dropoff_area: j.dropoff_area ?? null,
      dropoff_address: j.dropoff_address ?? null,
      job_date: j.job_date ?? null,
      job_time: j.job_time ?? null,
      estimated_distance_km: j.estimated_distance_km ?? null,
      // A quote-request job has no published price — movers must send an offer.
      price:
        j.pricing_type === "quote_request"
          ? null
          : (j.suggested_courier_payment ?? j.payment ?? null),
      status: j.status ?? null,
      partner_name,
      partner_slug,
      taken: await isJobTaken(supabaseAdmin, j),
    };
  });

export const submitJobLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        jobId: z.string().trim().min(4).max(60),
        kind: z.enum(["take", "quote"]),
        fullName: z.string().trim().min(2).max(60),
        phone: z.string().trim().min(9).max(20),
        price: z.number().positive().max(100000).nullable().optional(),
        note: z.string().trim().max(400).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, job_number, service_category, pickup_area, pickup_address, dropoff_area, dropoff_address, job_date, job_time, suggested_courier_payment, payment, pricing_type, selected_courier_id, partner_id",
      )
      .eq(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.jobId)
          ? "id"
          : ("short_code" as "id"),
        data.jobId,
      )
      .maybeSingle();
    if (!job) throw new Error("העבודה לא נמצאה");
    const j = job as any;
    if (await isJobTaken(supabaseAdmin, j)) throw new Error("העבודה כבר נתפסה");

    let partnerName: string | null = null;
    let partnerSlug: string | null = null;
    if (j.partner_id) {
      const { data: p } = await supabaseAdmin
        .from("partners")
        .select("name, slug")
        .eq("id", j.partner_id)
        .maybeSingle();
      partnerName = (p as any)?.name ?? null;
      partnerSlug = (p as any)?.slug ?? null;
    }

    const { error } = await supabaseAdmin.from("job_leads").insert({
      job_id: j.id,
      kind: data.kind,
      full_name: data.fullName,
      phone: data.phone,
      price: data.kind === "quote" ? (data.price ?? null) : (j.suggested_courier_payment ?? j.payment ?? null),
      note: data.note ?? null,
      partner_slug: partnerSlug,
    } as never);
    if (error) throw new Error(error.message);

    // Notify the admin WhatsApp number.
    try {
      const { data: cfg } = await supabaseAdmin
        .from("app_config")
        .select("value")
        .eq("key", "admin_notify_phone")
        .maybeSingle();
      const phone =
        ((cfg as any)?.value || process.env.ADMIN_NOTIFY_PHONE || "0557122972").trim();
      if (phone) {
        const { greenSendText } = await import("./green-api.internal.server");
        const pickup =
          [j.pickup_address, j.pickup_area].filter(Boolean).join(", ") || "—";
        const dropoff =
          [j.dropoff_address, j.dropoff_area].filter(Boolean).join(", ") || "—";
        const when = [j.job_date, j.job_time].filter(Boolean).join(" ") || "עכשיו";
        const lines = [
          data.kind === "take"
            ? `✅ *מוביל לקח עבודה*${j.job_number ? ` #${j.job_number}` : ""}`
            : `💬 *הצעת מחיר חדשה*${j.job_number ? ` #${j.job_number}` : ""}`,
          `👤 ${data.fullName}`,
          `📱 ${data.phone}`,
          data.kind === "quote" && data.price ? `💰 הצעה: ₪${data.price}` : "",
          data.kind === "take" && (j.suggested_courier_payment ?? j.payment)
            ? `💰 מחיר: ₪${j.suggested_courier_payment ?? j.payment}`
            : "",
          data.note ? `📝 ${data.note}` : "",
          ``,
          `📍 מ: ${pickup}`,
          `🎯 ל: ${dropoff}`,
          `⏰ ${when}`,
          partnerName ? `🤝 שותף: ${partnerName}` : "",
        ].filter(Boolean);
        await greenSendText(phone, lines.join("\n"));
      }
    } catch (e) {
      console.error("[public-job] admin notify failed", e);
    }

    return { ok: true as const };
  });
