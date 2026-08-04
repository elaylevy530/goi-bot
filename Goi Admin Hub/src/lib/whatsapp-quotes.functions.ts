import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Notify nearby active couriers (matching vehicle, opted-in to quotes)
 * that a new quote request is open. Sends interactive WhatsApp buttons.
 */
export const notifyCouriersOfQuoteRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendButtons } = await import("./green-api.server");

    // Caller must own the job (business)
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, pricing_type, pickup_address, pickup_area, dropoff_address, dropoff_area, vehicle_required, description, quote_deadline_at, status, customer_id, suggested_courier_payment, customer_price, estimated_distance_km, job_type, job_date, job_time")
      .eq("id", data.jobId)
      .single();
    if (jobErr || !job) throw new Error("Job not found");
    if (job.pricing_type !== "quote_request") throw new Error("Not a quote request job");

    const query = supabaseAdmin
      .from("couriers")
      .select("id, full_name, whatsapp_phone, vehicle_type")
      .eq("courier_status", "פעיל")
      .eq("is_paused", false)
      .not("whatsapp_phone", "is", null);

    if (job.vehicle_required) {
      query.eq("vehicle_type", job.vehicle_required as never);
    }
    const { data: couriers, error: cErr } = await query.limit(40);
    if (cErr) throw new Error(cErr.message);

    // Compute 3 preset price tiers around a base, so the courier just taps.
    const km = Number(job.estimated_distance_km) || 0;
    const base =
      Number(job.suggested_courier_payment) ||
      (Number(job.customer_price) ? Number(job.customer_price) * 0.8 : 0) ||
      (km ? Math.max(30, km * 8) : 0) ||
      50;
    const round5 = (n: number) => Math.max(10, Math.round(n / 5) * 5);
    const priceOptions = Array.from(
      new Set([round5(base), round5(base + 10), round5(base + 25)]),
    );

    const pickupLine = [job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—";
    const dropoffLine = [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—";

    const summary =
      `🆕 בקשת הצעת מחיר חדשה\n\n` +
      (job.job_type ? `📦 סוג: ${job.job_type}\n` : "") +
      `📍 איסוף: ${pickupLine}\n` +
      `🎯 מסירה: ${dropoffLine}\n` +
      (km ? `📏 מרחק: ${km.toFixed(1)} ק"מ\n` : "") +
      (job.vehicle_required ? `🚚 רכב: ${job.vehicle_required}\n` : "") +
      (job.job_time ? `⏰ למסירה: ${[job.job_date, job.job_time].filter(Boolean).join(" ")}\n` : "") +
      (job.description ? `📝 ${job.description}\n` : "") +
      (job.quote_deadline_at ? `\n⏰ עד: ${new Date(job.quote_deadline_at).toLocaleString("he-IL")}\n` : "") +
      `\nבחר את המחיר שאתה מבקש על העבודה 👇`;

    let sent = 0;
    for (const c of couriers ?? []) {
      if (!c.whatsapp_phone) continue;
      try {
        await sendButtons(
          c.whatsapp_phone,
          summary,
          priceOptions.map((p) => ({
            buttonId: `quote:${job.id}:bid:${p}`,
            buttonText: `₪${p}`,
          })),
          "GOI — לחץ על המחיר שמתאים לך",
        );
        await supabaseAdmin.from("wa_bot_state").insert({
          phone: c.whatsapp_phone,
          state: "awaiting_quote_choice",
          job_id: job.id,
          courier_id: c.id,
        });
        sent++;
      } catch (e) {
        console.error("WA send failed for courier", c.id, e);
      }
    }

    return { ok: true, sent, total: couriers?.length ?? 0 };
  });

/**
 * Send the customer the top-3 shortlisted quotes with selection buttons.
 */
export const notifyCustomerOfShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendButtons } = await import("./green-api.server");

    const { data: job } = await supabase
      .from("jobs")
      .select("id, customer_id, pickup_address, dropoff_address")
      .eq("id", data.jobId)
      .single();
    if (!job) throw new Error("Job not found");

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, name, phone")
      .eq("id", job.customer_id!)
      .single();
    if (!customer?.phone) return { ok: false, reason: "no phone" };

    const { data: quotes } = await supabaseAdmin
      .from("job_quotes")
      .select("id, price, courier_id, estimated_arrival_minutes, courier_rating_snapshot, couriers(full_name)")
      .eq("job_id", job.id)
      .eq("status", "shortlisted")
      .order("price", { ascending: true })
      .limit(3);

    if (!quotes?.length) return { ok: false, reason: "no shortlist" };

    const lines = quotes.map((q, i) => {
      const name = (q.couriers as { full_name?: string } | null)?.full_name ?? "שליח";
      const rating = q.courier_rating_snapshot ? `⭐ ${Number(q.courier_rating_snapshot).toFixed(1)}` : "";
      const eta = q.estimated_arrival_minutes ? `🕒 ${q.estimated_arrival_minutes} דק'` : "";
      return `${i + 1}. ${name} — ₪${q.price} ${rating} ${eta}`;
    }).join("\n");

    const msg =
      `📋 התקבלו הצעות למשלוח שלך:\n` +
      `📍 ${job.pickup_address || ""} → ${job.dropoff_address || ""}\n\n${lines}\n\nבחר הצעה לאישור:`;

    await sendButtons(
      customer.phone,
      msg,
      quotes.map((q, i) => ({
        buttonId: `select:${job.id}:${q.id}`,
        buttonText: `אשר ${i + 1} (₪${q.price})`,
      })),
      "GOI — בחירת שליח",
    );

    await supabaseAdmin.from("wa_bot_state").insert({
      phone: customer.phone,
      state: "awaiting_customer_selection",
      job_id: job.id,
      customer_id: customer.id,
      payload: { quote_ids: quotes.map((q) => q.id) },
    });

    return { ok: true };
  });
