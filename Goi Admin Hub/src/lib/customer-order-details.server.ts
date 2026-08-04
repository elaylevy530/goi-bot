/**
 * Shared loader for a single customer order detail card (job + courier +
 * payment breakdown). Used by both the authenticated customer route and the
 * guest (token-verified) route so both render identical UI.
 */
export async function loadOrderDetails(jobId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, status, service_category, pickup_address, dropoff_address, customer_price, created_at, recipient_tracking_token, description, job_date, job_time, guest_phone, guest_name, recipient_name, recipient_phone, selected_courier_id, courier_step, delivery_status, per_job_paid, pricing_type")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!job) throw new Error("Not found");
  const j = job as Record<string, any>;

  let courier: Record<string, any> | null = null;
  if (j.selected_courier_id) {
    const [{ data: c }, { data: st }] = await Promise.all([
      supabaseAdmin
        .from("couriers")
        .select("id, full_name, whatsapp_phone, avatar_url, vehicle_type, vehicle_label, courier_kind, base_city, bio, created_at")
        .eq("id", j.selected_courier_id)
        .maybeSingle(),
      supabaseAdmin
        .from("courier_stats")
        .select("avg_rating, jobs_completed, on_time_rate, acceptance_rate")
        .eq("courier_id", j.selected_courier_id)
        .maybeSingle(),
    ]);
    if (c) {
      const cc = c as Record<string, any>;
      const ss = (st ?? {}) as Record<string, any>;
      courier = {
        id: String(cc.id),
        full_name: cc.full_name ?? null,
        whatsapp_phone: cc.whatsapp_phone ?? null,
        avatar_url: cc.avatar_url ?? null,
        vehicle_type: cc.vehicle_type ?? null,
        vehicle_label: cc.vehicle_label ?? null,
        courier_kind: cc.courier_kind ?? null,
        base_city: cc.base_city ?? null,
        bio: cc.bio ?? null,
        member_since: cc.created_at ?? null,
        avg_rating: ss.avg_rating != null ? Number(ss.avg_rating) : null,
        jobs_completed: ss.jobs_completed != null ? Number(ss.jobs_completed) : null,
        on_time_rate: ss.on_time_rate != null ? Number(ss.on_time_rate) : null,
        acceptance_rate: ss.acceptance_rate != null ? Number(ss.acceptance_rate) : null,
      };
    }
  }

  const total = Number(j.customer_price ?? 0);
  let payment = {
    total,
    payment_mode: "cash_only" as string,
    deposit_percent: 0,
    prepaid: 0,
    remaining: total,
  };
  if (j.service_category) {
    const { data: rule } = await supabaseAdmin
      .from("express_pricing_rules")
      .select("payment_mode, deposit_percent")
      .eq("service_category", j.service_category)
      .maybeSingle();
    const r = (rule ?? {}) as { payment_mode?: string; deposit_percent?: number };
    const mode = r.payment_mode ?? "cash_only";
    const pct = Number(r.deposit_percent ?? 0);
    const depositAmount = Math.round(((total * pct) / 100) * 100) / 100;
    const prepaid = j.per_job_paid
      ? mode === "full_upfront" ? total : mode === "deposit" ? depositAmount : 0
      : 0;
    payment = {
      total,
      payment_mode: mode,
      deposit_percent: mode === "deposit" ? pct : 0,
      prepaid,
      remaining: Math.max(0, Math.round((total - prepaid) * 100) / 100),
    };
  }

  return { job: j, courier, payment };
}
