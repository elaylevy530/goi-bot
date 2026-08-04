import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function customerPhoneToEmail(raw: string): string {
  return `${normalizePhone(raw)}@customers.goi.local`;
}

function phoneFromClaims(claims: any): string {
  const email = (claims?.email as string | undefined) ?? "";
  const phoneFromEmail = email.split("@")[0] ?? "";
  const meta = (claims?.user_metadata as { phone?: string } | undefined) ?? {};
  return meta.phone || phoneFromEmail;
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(6).max(72),
});

/**
 * Public: self sign-up for a private (individual) customer.
 */
export const signupCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const email = customerPhoneToEmail(phone);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone, role: "customer" },
    });
    if (createErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error(createErr.message);
      throw new Error("כבר קיים חשבון לטלפון הזה. נסה להיכנס.");
    }
    return { ok: true, login_phone: phone, user_id: created.user!.id };
  });

/** Authenticated: list current customer's orders (matched by phone). */
export const getMyOrdersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) return [];

    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, status, service_category, pickup_address, dropoff_address, customer_price, created_at, recipient_tracking_token, description, job_date, job_time, pricing_type, selected_courier_id, selected_quote_id")
      .eq("guest_phone", phone)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, any>>;

    // How many mover quotes came in per pending order (for the "waiting for approval" section)
    const pendingIds = rows
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

    return rows.map((r) => ({ ...r, quotes_count: quoteCounts[r.id as string] ?? 0 })) as Array<{
      id: string; job_number: string; status: string; service_category: string | null;
      pickup_address: string | null; dropoff_address: string | null;
      customer_price: number | null; created_at: string;
      recipient_tracking_token: string | null; description: string | null;
      job_date: string | null; job_time: string | null;
      pricing_type: string | null; selected_courier_id: string | null;
      selected_quote_id: string | null; quotes_count: number;
    }>;

  });

/** Authenticated: single order detail (must belong to the calling customer). */
export const getMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) throw new Error("Missing phone in profile");

    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, status, service_category, pickup_address, dropoff_address, customer_price, created_at, recipient_tracking_token, description, job_date, job_time, guest_phone, guest_name, recipient_name, recipient_phone, selected_courier_id, courier_step, delivery_status, per_job_paid, pricing_type")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job || job.guest_phone !== phone) throw new Error("Not found");

    // Courier profile + public reputation stats (shown on the customer's
    // active-order screen once a mover is assigned).
    type CourierCardData = {
      id: string;
      full_name: string | null;
      whatsapp_phone: string | null;
      avatar_url: string | null;
      vehicle_type: string | null;
      vehicle_label: string | null;
      courier_kind: string | null;
      base_city: string | null;
      bio: string | null;
      member_since: string | null;
      avg_rating: number | null;
      jobs_completed: number | null;
      on_time_rate: number | null;
      acceptance_rate: number | null;
    };
    let courier: CourierCardData | null = null;
    if (job.selected_courier_id) {
      const [{ data: c }, { data: st }] = await Promise.all([
        supabaseAdmin
          .from("couriers")
          .select("id, full_name, whatsapp_phone, avatar_url, vehicle_type, vehicle_label, courier_kind, base_city, bio, created_at")
          .eq("id", job.selected_courier_id)
          .maybeSingle(),
        supabaseAdmin
          .from("courier_stats")
          .select("avg_rating, jobs_completed, on_time_rate, acceptance_rate")
          .eq("courier_id", job.selected_courier_id)
          .maybeSingle(),
      ]);
      if (c) {
        const cc = c as Record<string, unknown>;
        const ss = (st ?? {}) as Record<string, unknown>;
        courier = {
          id: String(cc.id),
          full_name: (cc.full_name as string) ?? null,
          whatsapp_phone: (cc.whatsapp_phone as string) ?? null,
          avatar_url: (cc.avatar_url as string) ?? null,
          vehicle_type: (cc.vehicle_type as string) ?? null,
          vehicle_label: (cc.vehicle_label as string) ?? null,
          courier_kind: (cc.courier_kind as string) ?? null,
          base_city: (cc.base_city as string) ?? null,
          bio: (cc.bio as string) ?? null,
          member_since: (cc.created_at as string) ?? null,
          avg_rating: ss.avg_rating != null ? Number(ss.avg_rating) : null,
          jobs_completed: ss.jobs_completed != null ? Number(ss.jobs_completed) : null,
          on_time_rate: ss.on_time_rate != null ? Number(ss.on_time_rate) : null,
          acceptance_rate: ss.acceptance_rate != null ? Number(ss.acceptance_rate) : null,
        };
      }
    }

    // Payment breakdown — how much was charged up front (deposit / full) and
    // how much the customer still owes the mover when the job is done.
    const total = Number(job.customer_price ?? 0);
    let payment = {
      total,
      payment_mode: "cash_only" as string,
      deposit_percent: 0,
      prepaid: 0,
      remaining: total,
    };
    if (job.service_category) {
      const { data: rule } = await supabaseAdmin
        .from("express_pricing_rules")
        .select("payment_mode, deposit_percent")
        .eq("service_category", job.service_category)
        .maybeSingle();
      const r = (rule ?? {}) as { payment_mode?: string; deposit_percent?: number };
      const mode = r.payment_mode ?? "cash_only";
      const pct = Number(r.deposit_percent ?? 0);
      const depositAmount = Math.round((total * pct) / 100 * 100) / 100;
      const prepaid = job.per_job_paid
        ? (mode === "full_upfront" ? total : mode === "deposit" ? depositAmount : 0)
        : 0;
      payment = {
        total,
        payment_mode: mode,
        deposit_percent: mode === "deposit" ? pct : 0,
        prepaid,
        remaining: Math.max(0, Math.round((total - prepaid) * 100) / 100),
      };
    }

    return { job, courier, payment };
  });


/** Authenticated: cancel an order that hasn't been assigned or delivered. */
export const cancelMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) throw new Error("Missing phone");

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, guest_phone, status, selected_courier_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!job || job.guest_phone !== phone) throw new Error("Not found");
    const nonCancellable = ["הושלמה", "בוטלה", "פעילה"];
    if (nonCancellable.includes(String(job.status))) throw new Error("לא ניתן לבטל הזמנה במצב זה");
    if (job.selected_courier_id) throw new Error("כבר שובץ שליח — פנה לתמיכה לביטול");

    const { error } = await supabaseAdmin
      .from("jobs")
      .update({ status: "בוטלה" as never } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Authenticated: update the customer's profile name. */
export const updateCustomerProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    full_name: z.string().trim().min(2).max(80),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        full_name: data.full_name,
        phone,
        role: "customer",
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Authenticated: send a WhatsApp message from the customer to the assigned
 * courier through the bot. The bot prefixes the message with the order
 * number and the customer's name so the courier knows the source.
 */
export const sendCourierMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    message: z.string().trim().min(1).max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendText } = await import("@/lib/whatsapp/provider.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) throw new Error("Missing phone");

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, guest_phone, guest_name, selected_courier_id, pickup_address, dropoff_address")
      .eq("id", data.job_id)
      .maybeSingle();
    if (!job || job.guest_phone !== phone) throw new Error("Not found");
    if (!job.selected_courier_id) throw new Error("עדיין לא שובץ שליח לשלוח לו הודעה");

    const { data: courier } = await supabaseAdmin
      .from("couriers")
      .select("full_name, whatsapp_phone")
      .eq("id", job.selected_courier_id)
      .maybeSingle();
    const target = (courier as { whatsapp_phone?: string | null } | null)?.whatsapp_phone ?? null;
    if (!target) throw new Error("לא נמצא מספר וואטסאפ לשליח");

    const customerName = (job as { guest_name?: string | null }).guest_name ?? "לקוח";
    const jobNumber = (job as { job_number?: string | null }).job_number ?? data.job_id.slice(0, 8);
    const text =
      `📩 עדכון מלקוח על הזמנה #${jobNumber}\n` +
      `מ: ${customerName} (${phone})\n\n` +
      data.message.trim() +
      `\n\nלמענה — פשוט השב להודעה זו.`;

    await sendText(target, text);

    try {
      await supabaseAdmin.from("whatsapp_messages").insert({
        job_id: data.job_id,
        direction: "outbound",
        phone: target,
        body: text,
        source: "customer_portal",
      } as never);
    } catch {
      // logging is best-effort; do not fail the user action if the log table shape differs
    }

    return { ok: true };
  });

/** Authenticated: list quotes for one of the customer's jobs. */
export const getMyQuotesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) return [];

    const { data: job } = await supabaseAdmin
      .from("jobs").select("id, guest_phone").eq("id", data.job_id).maybeSingle();
    if (!job || (job as { guest_phone?: string | null }).guest_phone !== phone) return [];

    const { data: quotes } = await supabaseAdmin
      .from("job_quotes")
      .select("id, price, note, estimated_arrival_minutes, courier_rating_snapshot, courier_completed_jobs_snapshot, status, created_at, courier_id, couriers(full_name, whatsapp_phone)")
      .eq("job_id", data.job_id)
      .order("price", { ascending: true });
    return (quotes ?? []) as Array<{
      id: string; price: number; note: string | null;
      estimated_arrival_minutes: number | null;
      courier_rating_snapshot: number | null;
      courier_completed_jobs_snapshot: number | null;
      status: string; created_at: string; courier_id: string;
      couriers: { full_name: string | null; whatsapp_phone: string | null } | null;
    }>;
  });

/** Authenticated: pick a quote — reuses the same RPC the WhatsApp button flow uses. */
export const selectMyQuoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    quote_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) throw new Error("Missing phone");

    const { data: job } = await supabaseAdmin
      .from("jobs").select("id, guest_phone").eq("id", data.job_id).maybeSingle();
    if (!job || (job as { guest_phone?: string | null }).guest_phone !== phone) throw new Error("Not found");

    const { error } = await supabaseAdmin.rpc("select_job_quote" as never, { _quote_id: data.quote_id } as never);
    if (error) throw new Error(error.message);

    // Mark job as assigned; the WhatsApp briefing to the courier is sent by the
    // standard downstream flow (webhook / status updates).
    try {
      await supabaseAdmin.from("jobs").update({
        delivery_status: "assigned",
        courier_step: "שליח אישר",
        accepted_at: new Date().toISOString(),
        current_status_updated_at: new Date().toISOString(),
      } as never).eq("id", data.job_id);
    } catch { /* best-effort */ }

    return { ok: true };
  });

/** Authenticated: list all chat threads (one per job that has a courier). */
export const getMyChatThreadsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) return [];

    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, status, pickup_address, dropoff_address, selected_courier_id, created_at, couriers:selected_courier_id(full_name, whatsapp_phone)")
      .eq("guest_phone", phone)
      .not("selected_courier_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    return (jobs ?? []) as Array<{
      id: string; job_number: string; status: string;
      pickup_address: string | null; dropoff_address: string | null;
      selected_courier_id: string | null; created_at: string;
      couriers: { full_name: string | null; whatsapp_phone: string | null } | null;
    }>;
  });

/** Authenticated: read the WhatsApp thread for one of the customer's jobs. */
export const getMyChatMessagesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) return { job: null, courier: null, messages: [] as any[] };

    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, guest_phone, selected_courier_id, status, pickup_address, dropoff_address")
      .eq("id", data.job_id).maybeSingle();
    if (!job || (job as { guest_phone?: string | null }).guest_phone !== phone) {
      return { job: null, courier: null, messages: [] };
    }

    let courier: { full_name: string | null; whatsapp_phone: string | null } | null = null;
    const courierId = (job as { selected_courier_id?: string | null }).selected_courier_id ?? null;
    if (courierId) {
      const { data: c } = await supabaseAdmin
        .from("couriers").select("full_name, whatsapp_phone").eq("id", courierId).maybeSingle();
      if (c) courier = {
        full_name: (c as { full_name: string | null }).full_name ?? null,
        whatsapp_phone: (c as { whatsapp_phone: string | null }).whatsapp_phone ?? null,
      };
    }

    const { data: msgs } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("id, direction, body, created_at, phone")
      .eq("job_id", data.job_id)
      .order("created_at", { ascending: true })
      .limit(200);
    return {
      job: {
        id: (job as { id: string }).id,
        job_number: (job as { job_number: string }).job_number,
        status: (job as { status: string }).status,
        pickup_address: (job as { pickup_address: string | null }).pickup_address,
        dropoff_address: (job as { dropoff_address: string | null }).dropoff_address,
      },
      courier,
      messages: (msgs ?? []) as Array<{ id: string; direction: string; body: string | null; created_at: string; phone: string | null }>,
    };
  });

/** Authenticated: open a support ticket (routed to admins). */
export const openSupportTicketFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    message: z.string().trim().min(2).max(1000),
    job_id: z.string().uuid().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    const { error } = await supabaseAdmin.from("support_tickets").insert({
      job_id: data.job_id ?? null,
      issue_type: "customer_support",
      message: `[לקוח פרטי ${phone}] ${data.message}`,
      status: "open",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


/** Authenticated: customer updates the fixed price of an open order and re-sends it to the group. */
export const repriceMyOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), price: z.number().min(1).max(100000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = phoneFromClaims(context.claims);
    if (!phone) throw new Error("Missing phone");
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id, guest_phone")
      .eq("id", data.id)
      .maybeSingle();
    if (!job || (job as any).guest_phone !== phone) throw new Error("Not found");
    const { repriceAndResend } = await import("./order-reprice.server");
    return repriceAndResend(data.id, data.price);
  });
