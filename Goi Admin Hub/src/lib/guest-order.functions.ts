/**
 * Goi Express — server functions for guest (private) orders.
 * No authentication required: private customers order without registering.
 * All writes go through supabaseAdmin (RLS bypass) with strict Zod validation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { broadcastGuestJobToMatchingCouriers } from "./guest-dispatch.server";

const SERVICE_CATEGORIES = ["same_day", "scheduled", "small_move", "big_move"] as const;

function randomTrackingToken() {
  // 24 hex chars — collision-resistant, URL-safe
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Format a date in Israel local time so job_date/job_time match what the customer picked. */
function israelDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function israelTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d) + ":00";
}

/** Public read of pricing rules for the guest flow (used to show pricing preview). */
export const getPricingRulesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("express_pricing_rules")
    .select("*")
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/**
 * Poll a guest job's dispatch status. Used by the customer "searching for
 * courier" screen to display a real found-state only after a courier claims
 * the job. Verified with the tracking token so no auth is required.
 */
export const getGuestJobStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, status, selected_courier_id, recipient_tracking_token, matching_couriers_count")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as {
      id: string;
      status: string;
      selected_courier_id: string | null;
      recipient_tracking_token: string | null;
      matching_couriers_count: number | null;
    };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");

    let courier: { id: string; full_name: string | null; avatar_url: string | null; vehicle_type: string | null } | null = null;
    if (j.selected_courier_id) {
      const { data: c } = await supabaseAdmin
        .from("couriers")
        .select("id, full_name, avatar_url, vehicle_type")
        .eq("id", j.selected_courier_id)
        .maybeSingle();
      courier = (c as any) ?? null;
    }
    return {
      status: j.status,
      selected_courier_id: j.selected_courier_id,
      matching_couriers_count: j.matching_couriers_count ?? 0,
      courier,
      found: !!j.selected_courier_id,
    };
  });


const MOVER_VEHICLE_KEYS = ["mini_van", "van", "truck_3_5t", "truck_8t", "truck_12t"] as const;

const createSchema = z.object({
  service_category: z.enum(SERVICE_CATEGORIES),
  guest_name: z.string().trim().min(2).max(80),
  guest_phone: z.string().trim().min(9).max(20),
  pickup_address: z.string().trim().min(3).max(300),
  dropoff_address: z.string().trim().min(3).max(300),
  pickup_lat: z.number().optional().nullable(),
  pickup_lng: z.number().optional().nullable(),
  dropoff_lat: z.number().optional().nullable(),
  dropoff_lng: z.number().optional().nullable(),
  recipient_name: z.string().trim().max(80).optional().nullable(),
  recipient_phone: z.string().trim().max(20).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  // Pricing model chosen by the customer
  pricing_model: z.enum(["fixed_price", "quote_request"]),
  offered_price: z.number().positive().max(100000).optional().nullable(),
  // NEW — private-customer extras
  mover_vehicle: z.enum(MOVER_VEHICLE_KEYS).optional().nullable(),
  items: z.array(z.object({
    label: z.string().trim().min(1).max(60),
    qty: z.number().int().min(1).max(99),
  })).max(30).optional().nullable(),
  photo_paths: z.array(z.string().min(3).max(300)).max(6).optional().nullable(),
  terms_accepted: z.literal(true),
  // Partner panel the order came from (e.g. "aluf")
  partner_slug: z.string().trim().max(60).optional().nullable(),
});


/**
 * Create a Goi Express guest order.
 * Inserts a job with status='טיוטה' (draft). The job is not broadcast to
 * couriers until payment (or the "cash on delivery" flow) is confirmed via
 * confirmGuestOrderFn.
 */
export const createGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load pricing rule
    const { data: rule, error: ruleErr } = await supabaseAdmin
      .from("express_pricing_rules")
      .select("*")
      .eq("service_category", data.service_category)
      .maybeSingle();
    if (ruleErr) throw new Error(ruleErr.message);
    if (!rule) throw new Error("Service category not configured");

    const r = rule as {
      payment_mode: string;
      deposit_percent: number;
      min_price: number;
      base_price: number;
      price_per_km: number;
      allow_customer_quote: boolean;
      allow_customer_fixed_price: boolean;
      display_name: string;
    };

    if (data.pricing_model === "fixed_price" && !r.allow_customer_fixed_price)
      throw new Error("שירות זה תומך רק בקבלת הצעות מחיר");
    if (data.pricing_model === "quote_request" && !r.allow_customer_quote)
      throw new Error("שירות זה תומך רק במחיר קבוע מראש");

    const estimatedPrice = data.pricing_model === "fixed_price"
      ? Math.max(Number(data.offered_price ?? 0), Number(r.min_price ?? 0))
      : Math.max(Number(r.base_price ?? 0), Number(r.min_price ?? 0));

    const trackingToken = randomTrackingToken();
    const jobDate = data.scheduled_at ? new Date(data.scheduled_at) : null;
    const serviceMeta = {
      same_day: { job_type: "משלוח בודד", package_type: "חבילות / מסמכים", item_category: null },
      scheduled: { job_type: "משלוח בודד", package_type: "חבילות / מסמכים", item_category: null },
      small_move: { job_type: "אחר", package_type: "הובלה קטנה", item_category: "הובלה קטנה" },
      big_move: { job_type: "אחר", package_type: "הובלת דירה", item_category: "הובלת דירה" },
    }[data.service_category];

    // Guest extras (recipient, mover vehicle, structured items, photos, terms)
    // Live inside pricing_snapshot to avoid a schema change; readers can pull
    // them without joins.
    const guestExtras = {
      recipient_name: data.recipient_name ?? null,
      recipient_phone: data.recipient_phone ?? null,
      mover_vehicle: data.mover_vehicle ?? null,
      items: data.items ?? [],
      photo_paths: data.photo_paths ?? [],
      terms_accepted_at: new Date().toISOString(),
    };

    const insertPayload: Record<string, unknown> = {
      job_type: serviceMeta.job_type,
      status: "טיוטה",
      customer_id: null,
      guest_name: data.guest_name,
      guest_phone: data.guest_phone,
      customer_name: data.guest_name,
      service_category: data.service_category,
      pickup_address: data.pickup_address,
      dropoff_address: data.dropoff_address,
      pickup_lat: data.pickup_lat ?? null,
      pickup_lng: data.pickup_lng ?? null,
      dropoff_lat: data.dropoff_lat ?? null,
      dropoff_lng: data.dropoff_lng ?? null,
      recipient_name: data.recipient_name ?? data.guest_name,
      recipient_phone: data.recipient_phone ?? data.guest_phone,
      description: data.description ?? r.display_name,
      package_type: serviceMeta.package_type,
      item_category: serviceMeta.item_category,
      pricing_type: data.pricing_model === "fixed_price" ? "fixed_price" : "quote_request",
      payment: estimatedPrice,
      customer_price: estimatedPrice,
      invoice_required: false,
      couriers_needed: 1,
      matching_couriers_count: 0,
      requires_cash: r.payment_mode === "cash_only",
      recipient_tracking_token: trackingToken,
      job_date: jobDate ? israelDate(jobDate) : null,
      job_time: jobDate ? israelTime(jobDate) : null,
      pricing_snapshot: { guest_extras: guestExtras },
    };

    // Attach the partner (if the order came from a partner panel)
    if (data.partner_slug) {
      const { data: partner } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("slug", data.partner_slug)
        .eq("is_active", true)
        .maybeSingle();
      if (partner) insertPayload.partner_id = (partner as { id: string }).id;
    }


    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("jobs")
      .insert(insertPayload as never)
      .select("id, job_number, recipient_tracking_token, customer_price")
      .single();
    if (insErr) throw new Error(insErr.message);

    const job = inserted as { id: string; job_number: string; recipient_tracking_token: string; customer_price: number };

    const depositAmount = r.payment_mode === "deposit"
      ? Math.round((Number(job.customer_price) * Number(r.deposit_percent ?? 0)) / 100 * 100) / 100
      : 0;

    return {
      job_id: job.id,
      job_number: job.job_number,
      tracking_token: job.recipient_tracking_token,
      total_price: Number(job.customer_price),
      payment_mode: r.payment_mode, // 'cash_only' | 'deposit' | 'full_upfront'
      amount_to_charge_now: r.payment_mode === "full_upfront"
        ? Number(job.customer_price)
        : r.payment_mode === "deposit"
          ? depositAmount
          : 0,
      service_display_name: r.display_name,
    };
  });

/**
 * Mark a guest order as ready for broadcast. Called for cash-only orders
 * immediately, or after PayPal capture for prepaid/deposit orders.
 * Idempotent: re-calling on a job already broadcast is a no-op.
 */
export const confirmGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify tracking token matches to prevent random job_id activation
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, status, recipient_tracking_token")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as { id: string; status: string; recipient_tracking_token: string | null };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");
    if (j.status !== "טיוטה") return { ok: true, already: true };

    const { error: upErr } = await supabaseAdmin
      .from("jobs")
      .update({ status: "נשלחה לשליחים" } as never)
      .eq("id", j.id);
    if (upErr) throw new Error(upErr.message);
    const dispatch = await broadcastGuestJobToMatchingCouriers(j.id);
    return { ok: true, already: false, dispatch };
  });

/**
 * Create a PayPal checkout order for a guest job. Returns the order id;
 * the client uses it with PayPalButtons.createOrder.
 */
export const createGuestPaypalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
    amount: z.number().positive().max(1000000),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, recipient_tracking_token, per_job_paid")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as { id: string; job_number: string; recipient_tracking_token: string | null; per_job_paid: boolean };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");
    if (j.per_job_paid) throw new Error("כבר שולם עבור משלוח זה");

    const { createCheckoutOrder } = await import("@/lib/paypal/client.server");
    const order = await createCheckoutOrder({
      amount: data.amount.toFixed(2),
      currency: "ILS",
      invoice_id: `goi-express-${j.id}`,
      description: `Goi Express ${j.job_number}`,
      return_url: "https://goi-bot.lovable.app",
      cancel_url: "https://goi-bot.lovable.app",
    });
    await supabaseAdmin
      .from("jobs")
      .update({ paypal_order_id: order.id, per_job_amount: data.amount } as never)
      .eq("id", j.id);
    return { order_id: order.id };
  });

/** Capture the PayPal order and confirm the guest job. */
export const captureGuestPaypalOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
    order_id: z.string().min(4),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, customer_price, suggested_courier_payment, per_job_paid, paypal_order_id, recipient_tracking_token, status")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as {
      id: string; customer_price: number | null; suggested_courier_payment: number | null;
      per_job_paid: boolean; paypal_order_id: string | null; recipient_tracking_token: string | null; status: string;
    };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");
    if (j.per_job_paid) return { ok: true, already: true };
    if (j.paypal_order_id && j.paypal_order_id !== data.order_id) throw new Error("Order mismatch");

    const { captureOrder } = await import("@/lib/paypal/client.server");
    const captured = await captureOrder(data.order_id);
    const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (cap?.status !== "COMPLETED") throw new Error(`PayPal capture status: ${cap?.status ?? "unknown"}`);

    await supabaseAdmin.from("jobs")
      .update({ per_job_paid: true, status: "נשלחה לשליחים" } as never)
      .eq("id", j.id);
    await broadcastGuestJobToMatchingCouriers(j.id);

    return { ok: true, capture_id: cap.id };
  });

/**
 * Public (tracking-token protected) read of the best mover quotes for a guest
 * job. Returns up to 3 quotes ranked by price, ETA and courier rating so the
 * customer can pick one while the search animation is running.
 */
export const getGuestJobQuotesFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, recipient_tracking_token, selected_courier_id")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as { id: string; recipient_tracking_token: string | null; selected_courier_id: string | null };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");

    const { data: rows } = await supabaseAdmin
      .from("job_quotes")
      .select("id, courier_id, price, estimated_arrival_minutes, estimated_delivery_minutes, note, status, created_at, courier_rating_snapshot, courier_completed_jobs_snapshot")
      .eq("job_id", j.id)
      .in("status", ["pending", "shortlisted"])
      .order("price", { ascending: true })
      .limit(20);

    const quotes = (rows ?? []) as Array<{
      id: string; courier_id: string; price: number;
      estimated_arrival_minutes: number | null; estimated_delivery_minutes: number | null;
      note: string | null; status: string; created_at: string;
      courier_rating_snapshot: number | null; courier_completed_jobs_snapshot: number | null;
    }>;
    if (quotes.length === 0) return { quotes: [] as const, selected_courier_id: j.selected_courier_id };

    const ids = Array.from(new Set(quotes.map((q) => q.courier_id)));
    const { data: couriers } = await supabaseAdmin
      .from("couriers")
      .select("id, full_name, avatar_url, vehicle_type")
      .in("id", ids);
    const byId = new Map((couriers ?? []).map((c: any) => [c.id, c]));

    const minPrice = Math.min(...quotes.map((q) => Number(q.price)));
    const etaOf = (q: (typeof quotes)[number]) => Number(q.estimated_arrival_minutes ?? 60);
    const minEta = Math.min(...quotes.map(etaOf));

    const ranked = quotes
      .map((q) => {
        const c: any = byId.get(q.courier_id) ?? {};
        const rating = Number(q.courier_rating_snapshot ?? 4.6);
        // Lower is better: price weight 1, eta weight 0.5, rating bonus
        const score =
          Number(q.price) / Math.max(minPrice, 1) +
          0.5 * (etaOf(q) / Math.max(minEta, 1)) -
          0.25 * (rating / 5);
        return {
          id: q.id,
          courier_id: q.courier_id,
          price: Number(q.price),
          eta_minutes: q.estimated_arrival_minutes,
          delivery_minutes: q.estimated_delivery_minutes,
          note: q.note,
          created_at: q.created_at,
          courier_name: (c.full_name as string | null) ?? "מוביל",
          courier_image: (c.avatar_url as string | null) ?? null,
          vehicle_type: (c.vehicle_type as string | null) ?? null,
          rating: Math.round(rating * 10) / 10,
          completed_jobs: Number(q.courier_completed_jobs_snapshot ?? 0),
          score,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    return { quotes: ranked, selected_courier_id: j.selected_courier_id };
  });

/** Customer accepts one of the mover quotes (guest flow, token protected). */
export const selectGuestJobQuoteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    tracking_token: z.string().min(16),
    quote_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, recipient_tracking_token, selected_courier_id")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error("Job not found");
    const j = job as { id: string; recipient_tracking_token: string | null; selected_courier_id: string | null };
    if (j.recipient_tracking_token !== data.tracking_token) throw new Error("Invalid tracking token");
    if (j.selected_courier_id) return { ok: true, already: true };

    const { data: q } = await supabaseAdmin
      .from("job_quotes")
      .select("id, job_id, courier_id, price, status")
      .eq("id", data.quote_id)
      .maybeSingle();
    const quote = q as { id: string; job_id: string; courier_id: string; price: number; status: string } | null;
    if (!quote || quote.job_id !== j.id) throw new Error("Quote not found");

    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("job_quotes")
      .update({ status: "selected", selected_at: nowIso } as never)
      .eq("id", quote.id);
    await supabaseAdmin.from("job_quotes")
      .update({ status: "rejected" } as never)
      .eq("job_id", j.id)
      .neq("id", quote.id);
    const { error: upErr } = await supabaseAdmin.from("jobs")
      .update({
        selected_courier_id: quote.courier_id,
        status: "נבחר שליח",
        customer_price: Number(quote.price),
        payment: Number(quote.price),
      } as never)
      .eq("id", j.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, already: false };
  });

/* ================= Guest panel (no registration) ================= */

const refSchema = z.object({
  job_id: z.string().uuid(),
  tracking_token: z.string().min(16).max(64),
});

/** Public: list the guest's own orders, verified per-job by tracking token. */
export const getGuestOrdersFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ refs: z.array(refSchema).max(50) }).parse(d))
  .handler(async ({ data }) => {
    if (data.refs.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenById = new Map(data.refs.map((r) => [r.job_id, r.tracking_token]));

    const { data: rows, error } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, status, service_category, pickup_address, dropoff_address, customer_price, created_at, recipient_tracking_token, description, job_date, job_time, pricing_type, selected_courier_id, selected_quote_id")
      .in("id", [...tokenById.keys()])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const mine = (rows ?? []).filter(
      (r: any) => r.recipient_tracking_token && r.recipient_tracking_token === tokenById.get(r.id),
    ) as Array<Record<string, any>>;

    const pendingIds = mine
      .filter((r) => !r.selected_courier_id && !["הושלמה", "בוטלה"].includes(String(r.status)))
      .map((r) => r.id as string);
    const quoteCounts: Record<string, number> = {};
    if (pendingIds.length) {
      const { data: qs } = await supabaseAdmin
        .from("job_quotes")
        .select("job_id, status")
        .in("job_id", pendingIds);
      for (const q of qs ?? []) {
        if (["rejected", "cancelled", "expired"].includes(String((q as any).status))) continue;
        quoteCounts[(q as any).job_id] = (quoteCounts[(q as any).job_id] ?? 0) + 1;
      }
    }
    return mine.map((r) => ({ ...r, quotes_count: quoteCounts[r.id as string] ?? 0 }));
  });

/** Public: full detail card for one guest order (token verified). */
export const getGuestOrderDetailFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => refSchema.parse(d))
  .handler(async ({ data }) => {
    const { loadOrderDetails } = await import("./customer-order-details.server");
    const res = await loadOrderDetails(data.job_id);
    if (res.job.recipient_tracking_token !== data.tracking_token) throw new Error("Not found");
    return res;
  });

/** Public: guest cancels an order that has no mover assigned yet. */
export const cancelGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => refSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, status, selected_courier_id, recipient_tracking_token")
      .eq("id", data.job_id)
      .maybeSingle();
    const j = job as { status?: string; selected_courier_id?: string | null; recipient_tracking_token?: string | null } | null;
    if (!j || j.recipient_tracking_token !== data.tracking_token) throw new Error("Not found");
    if (["הושלמה", "בוטלה", "פעילה"].includes(String(j.status))) throw new Error("לא ניתן לבטל הזמנה במצב זה");
    if (j.selected_courier_id) throw new Error("כבר שובץ מוביל — פנה לתמיכה לביטול");
    const { error } = await supabaseAdmin
      .from("jobs")
      .update({ status: "בוטלה" as never } as never)
      .eq("id", data.job_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: guest edits the fixed price of an open order and re-sends it to the group. */
export const repriceGuestOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    refSchema.extend({ price: z.number().min(1).max(100000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, recipient_tracking_token")
      .eq("id", data.job_id)
      .maybeSingle();
    if (!job || (job as any).recipient_tracking_token !== data.tracking_token) throw new Error("Not found");
    const { repriceAndResend } = await import("./order-reprice.server");
    return repriceAndResend(data.job_id, data.price);
  });
