/**
 * Server functions for PayPal-based billing.
 * - createSetupTokenFn: client requests; returns approval link for vaulting.
 * - confirmVaultFn: after buyer approves, exchange setup -> payment token, store on customer.
 * - removeVaultFn: detach payment token + clear flags.
 * - chargeJobFn: admin/system charges a captured job against the business vault.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public PayPal config for the browser SDK (client_id is a public value). */
export const getPaypalConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID ?? "",
    mode: (process.env.PAYPAL_MODE ?? "live") as "live" | "sandbox",
    currency: "ILS",
  };
});



export const createSetupTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    source: z.enum(["paypal", "card"]).default("paypal"),
    return_url: z.string().url(),
    cancel_url: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { createSetupToken } = await import("@/lib/paypal/client.server");
    const token = await createSetupToken({
      customer_id: context.userId,
      source: data.source,
      return_url: data.return_url,
      cancel_url: data.cancel_url,
    });
    const approve = token.links.find((l) => l.rel === "approve" || l.rel === "payer-action");
    return { setup_token_id: token.id, approve_url: approve?.href ?? null };
  });

export const confirmVaultFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ setup_token_id: z.string().min(8) }).parse(d))
  .handler(async ({ data, context }) => {
    const { createPaymentToken } = await import("@/lib/paypal/client.server");
    const pm = await createPaymentToken(data.setup_token_id);
    const isPaypal = !!pm.payment_source.paypal;
    const brand = isPaypal ? "PayPal" : (pm.payment_source.card?.brand ?? "Card");
    const last4 = isPaypal ? null : (pm.payment_source.card?.last_digits ?? null);

    const { error } = await context.supabase
      .from("customers")
      .update({
        payment_method_on_file: true,
        payment_provider: "paypal",
        payment_method_brand: brand,
        payment_method_last4: last4,
        payment_method_added_at: new Date().toISOString(),
        paypal_vault_id: pm.id,
        paypal_payer_id: pm.payment_source.paypal?.payer_id ?? null,
        paypal_email: pm.payment_source.paypal?.email_address ?? null,
        paypal_setup_at: new Date().toISOString(),
        dispatch_blocked_reason: null,
      } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, brand, last4 };
  });

export const removeVaultFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: me } = await context.supabase
      .from("customers")
      .select("paypal_vault_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const vaultId = (me as { paypal_vault_id?: string | null } | null)?.paypal_vault_id;
    if (vaultId) {
      try {
        const { deletePaymentToken } = await import("@/lib/paypal/client.server");
        await deletePaymentToken(vaultId);
      } catch { /* token may already be gone */ }
    }
    await context.supabase
      .from("customers")
      .update({
        payment_method_on_file: false,
        payment_method_brand: null,
        payment_method_last4: null,
        payment_provider: null,
        payment_method_added_at: null,
        paypal_vault_id: null,
        paypal_payer_id: null,
        paypal_email: null,
        paypal_setup_at: null,
        dispatch_blocked_reason: "ללא אמצעי תשלום שמור",
      } as never)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/**
 * Admin-only: charge a billing record (by id) against the business vault.
 * Creates order + immediate capture. Idempotent via billing_record.id.
 */
export const chargeBillingRecordFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ billing_record_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createOrderWithVault, captureOrder } = await import("@/lib/paypal/client.server");

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("billing_records")
      .select("id, business_id, customer_price, status, paypal_capture_id, jobs(job_number)")
      .eq("id", data.billing_record_id)
      .maybeSingle();
    if (recErr || !rec) throw new Error(recErr?.message ?? "Billing record not found");
    const r = rec as { id: string; business_id: string; customer_price: number; status: string; paypal_capture_id: string | null; jobs: { job_number?: string } | null };
    if (r.paypal_capture_id) return { ok: true, already: true, capture_id: r.paypal_capture_id };

    const { data: biz } = await supabaseAdmin
      .from("customers")
      .select("paypal_vault_id, business_name")
      .eq("id", r.business_id)
      .maybeSingle();
    const vaultId = (biz as { paypal_vault_id?: string | null } | null)?.paypal_vault_id;
    if (!vaultId) throw new Error("Business has no PayPal vault token");

    const invoiceId = `goi-${r.id}`;
    const order = await createOrderWithVault({
      vault_id: vaultId,
      amount: Number(r.customer_price).toFixed(2),
      currency: "ILS",
      invoice_id: invoiceId,
      description: `Goi משלוח ${r.jobs?.job_number ?? r.id.slice(0, 8)}`,
    });
    const captured = await captureOrder(order.id);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];

    await supabaseAdmin
      .from("billing_records")
      .update({
        provider: "paypal",
        paypal_order_id: order.id,
        paypal_capture_id: capture?.id ?? null,
        status: capture?.status === "COMPLETED" ? "captured" : "pending",
        billing_status: capture?.status === "COMPLETED" ? "paid" : "open",
        error_message: null,
      } as never)
      .eq("id", r.id);

    return { ok: true, capture_id: capture?.id, status: capture?.status };
  });

/**
 * Per-job prepayment (business has no vault): creates a PayPal checkout order
 * for the job's customer_price and returns the approval URL. The business is
 * redirected to PayPal; on return we capture and the job is dispatched.
 */
export const createPerJobOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    return_url: z.string().url(),
    cancel_url: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("id, job_number, customer_id, customer_price, per_job_paid, paypal_order_id")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error(error?.message ?? "Job not found");
    const j = job as { id: string; job_number?: string; customer_id: string; customer_price: number | null; per_job_paid: boolean; paypal_order_id: string | null };
    if (j.per_job_paid) return { already_paid: true, approve_url: null, order_id: j.paypal_order_id };
    const amount = Number(j.customer_price ?? 0);
    if (!(amount > 0)) throw new Error("מחיר משלוח לא תקין — לא ניתן ליצור תשלום");

    const { createCheckoutOrder } = await import("@/lib/paypal/client.server");
    const order = await createCheckoutOrder({
      amount: amount.toFixed(2),
      currency: "ILS",
      invoice_id: `goi-job-${j.id}`,
      description: `Goi משלוח ${j.job_number ?? j.id.slice(0, 8)}`,
      return_url: data.return_url,
      cancel_url: data.cancel_url,
    });
    const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
    await context.supabase
      .from("jobs")
      .update({ paypal_order_id: order.id, per_job_amount: amount } as never)
      .eq("id", j.id);
    return { already_paid: false, approve_url: approve?.href ?? null, order_id: order.id };
  });

/**
 * Capture a previously approved per-job PayPal order, mark the job as paid
 * and create a billing_record. Called on the PayPal return URL.
 */
export const capturePerJobOrderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    order_id: z.string().min(4),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("id, customer_id, customer_price, suggested_courier_payment, per_job_paid, paypal_order_id")
      .eq("id", data.job_id)
      .maybeSingle();
    if (error || !job) throw new Error(error?.message ?? "Job not found");
    const j = job as { id: string; customer_id: string; customer_price: number | null; suggested_courier_payment: number | null; per_job_paid: boolean; paypal_order_id: string | null };
    if (j.per_job_paid) return { ok: true, already: true };
    if (j.paypal_order_id && j.paypal_order_id !== data.order_id) throw new Error("Order mismatch");

    const { captureOrder } = await import("@/lib/paypal/client.server");
    const captured = await captureOrder(data.order_id);
    const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (cap?.status !== "COMPLETED") throw new Error(`PayPal capture status: ${cap?.status ?? "unknown"}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const customerPrice = Number(j.customer_price ?? 0);
    const courierPay = Number(j.suggested_courier_payment ?? 0);
    const fee = Math.max(0, customerPrice - courierPay);
    await supabaseAdmin.from("billing_records").upsert({
      job_id: j.id,
      business_id: j.customer_id,
      customer_price: customerPrice,
      courier_payment: courierPay,
      platform_fee: fee,
      provider: "paypal",
      paypal_order_id: data.order_id,
      paypal_capture_id: cap.id,
      status: "captured",
      billing_status: "paid",
    } as never, { onConflict: "job_id" });
    await supabaseAdmin.from("jobs")
      .update({ per_job_paid: true } as never)
      .eq("id", j.id);
    return { ok: true };
  });

