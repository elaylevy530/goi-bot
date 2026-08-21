/**
 * Server functions for PayPal-based billing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";
import {
  billingFromBusiness,
  toPaypalApiBilling,
  validatePaypalIlBilling,
  type PaypalApiBillingAddress,
} from "@/lib/paypal-billing-address";
import { paypalLog } from "@/lib/paypal-log";

const billingAddressSchema = z.object({
  address_line_1: z.string().min(3).max(300),
  admin_area_2: z.string().min(2).max(120),
  postal_code: z.string().regex(/^\d{7}$/),
  country_code: z.literal("IL"),
});

function billingFromCustomer(me: {
  address?: string | null;
  city?: string | null;
  pickup_address?: string | null;
} | null | undefined): PaypalApiBillingAddress | undefined {
  const draft = billingFromBusiness(me);
  if (validatePaypalIlBilling(draft)) return undefined;
  return toPaypalApiBilling(draft);
}

export const getPaypalConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  return {
    clientId: String(process.env["PAYPAL_CLIENT_ID"] ?? "").trim(),
    mode: (String(process.env["PAYPAL_MODE"] ?? "live").trim() || "live") as "live" | "sandbox",
    currency: "ILS",
  };
});

export const createSetupTokenFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    source: z.enum(["paypal", "card"]).default("paypal"),
    return_url: z.string().url(),
    cancel_url: z.string().url(),
    billing_address: billingAddressSchema.optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { createSetupToken } = await import("@/lib/paypal/client.server");
    let billing = data.billing_address;
    if (!billing) {
      const me = await nestServerFetch<{
        address?: string | null;
        city?: string | null;
        pickup_address?: string | null;
      }>("/api/accounts/customers/me", { accessToken: context.accessToken });
      billing = billingFromCustomer(me);
    }
    paypalLog("setup_token_start", {
      source: data.source,
      has_billing: !!billing,
      street_len: billing?.address_line_1?.length ?? 0,
      city: billing?.admin_area_2 ?? null,
      zip_len: billing?.postal_code?.length ?? 0,
    }, "info");
    try {
      const token = await createSetupToken({
        customer_id: context.userId,
        source: data.source,
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        billing_address: billing,
      });
      const approve = token.links.find((l) => l.rel === "approve" || l.rel === "payer-action");
      paypalLog("setup_token_ok", { source: data.source, setup_token_id: token.id, status: token.status }, "info");
      return { setup_token_id: token.id, approve_url: approve?.href ?? null };
    } catch (e: unknown) {
      paypalLog("setup_token_fail", { source: data.source, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });

export const confirmVaultFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    setup_token_id: z.string().min(8),
    address: z.string().min(3).max(300).optional(),
    city: z.string().min(2).max(120).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { createPaymentToken, deletePaymentToken } = await import("@/lib/paypal/client.server");
    const existing = await nestServerFetch<{ paypal_vault_id?: string | null }>(
      "/api/accounts/customers/me",
      { accessToken: context.accessToken },
    );
    if (existing?.paypal_vault_id) {
      try {
        await deletePaymentToken(existing.paypal_vault_id);
      } catch { /* previous token may already be gone */ }
    }
    paypalLog("confirm_vault_start", { setup_token_id: data.setup_token_id.slice(0, 12) }, "info");
    try {
      const pm = await createPaymentToken(data.setup_token_id);
      const isPaypal = !!pm.payment_source.paypal;
      const brand = isPaypal ? "PayPal" : (pm.payment_source.card?.brand ?? "Card");
      const last4 = isPaypal ? null : (pm.payment_source.card?.last_digits ?? null);
      paypalLog("confirm_vault_ok", { brand, last4, vault_id: pm.id, paypal_customer: pm.customer?.id ?? null }, "info");

      await nestServerFetch("/api/accounts/customers/me", {
        accessToken: context.accessToken,
        method: "PATCH",
        body: {
          payment_method_on_file: true,
          payment_provider: "paypal",
          payment_method_brand: brand,
          payment_method_last4: last4,
          paypal_vault_id: pm.id,
          paypal_payer_id: pm.payment_source.paypal?.payer_id ?? null,
          paypal_email: pm.payment_source.paypal?.email_address ?? null,
          dispatch_blocked_reason: null,
          ...(data.address ? { address: data.address } : {}),
          ...(data.city ? { city: data.city } : {}),
        },
      });
      return { ok: true, brand, last4 };
    } catch (e: unknown) {
      paypalLog("confirm_vault_fail", { error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });

export const removeVaultFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    const me = await nestServerFetch<{ paypal_vault_id?: string | null }>(
      "/api/accounts/customers/me",
      { accessToken: context.accessToken },
    );
    const vaultId = me?.paypal_vault_id;
    if (vaultId) {
      try {
        const { deletePaymentToken } = await import("@/lib/paypal/client.server");
        await deletePaymentToken(vaultId);
      } catch { /* token may already be gone */ }
    }
    await nestServerFetch("/api/accounts/customers/me", {
      accessToken: context.accessToken,
      method: "PATCH",
      body: {
        payment_method_on_file: false,
        payment_method_brand: null,
        payment_method_last4: null,
        payment_provider: null,
        dispatch_blocked_reason: "ללא אמצעי תשלום שמור",
      },
    });
    return { ok: true };
  });

export const chargeBillingRecordFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({ billing_record_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    assertNestAdmin(context);
    const { createOrderWithVault, captureOrder } = await import("@/lib/paypal/client.server");

    const rec = await nestServerFetch<{
      id: string;
      business_id: string;
      customer_price: number;
      status: string;
      paypal_capture_id: string | null;
      job_number: string | null;
    }>(`/api/payments/billing-records/${data.billing_record_id}`, {
      accessToken: context.accessToken,
    });
    if (rec.paypal_capture_id) {
      return { ok: true, already: true, capture_id: rec.paypal_capture_id };
    }

    const biz = await nestServerFetch<{ paypal_vault_id?: string | null; business_name?: string | null; payment_method_brand?: string | null }>(
      `/api/accounts/customers/${rec.business_id}`,
      { accessToken: context.accessToken },
    );
    const vaultId = biz?.paypal_vault_id;
    if (!vaultId) throw new Error("Business has no PayPal vault token");
    const vaultSource = biz?.payment_method_brand === "PayPal" ? "paypal" : "card";

    const invoiceId = `goi-${rec.id}`;
    paypalLog("charge_vault_start", { billing_record_id: rec.id, vault_source: vaultSource }, "info");
    const order = await createOrderWithVault({
      vault_id: vaultId,
      amount: Number(rec.customer_price).toFixed(2),
      currency: "ILS",
      invoice_id: invoiceId,
      description: `Goi משלוח ${rec.job_number ?? rec.id.slice(0, 8)}`,
      source: vaultSource,
    });
    const captured = await captureOrder(order.id);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];

    await nestServerFetch(`/api/payments/billing-records/${rec.id}`, {
      accessToken: context.accessToken,
      method: "PATCH",
      body: {
        provider: "paypal",
        paypal_order_id: order.id,
        paypal_capture_id: capture?.id ?? null,
        status: capture?.status === "COMPLETED" ? "captured" : "pending",
        billing_status: capture?.status === "COMPLETED" ? "paid" : "open",
        error_message: null,
      },
    });

    return { ok: true, capture_id: capture?.id, status: capture?.status };
  });

export const createPerJobOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    return_url: z.string().url(),
    cancel_url: z.string().url(),
    billing_address: billingAddressSchema.optional(),
    attach_paypal_wallet: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const job = await nestServerFetch<{
      id: string;
      job_number?: string;
      customer_id: string;
      customer_price: number | null;
      per_job_paid: boolean;
      paypal_order_id: string | null;
    }>(`/api/jobs/${data.job_id}`, { accessToken: context.accessToken });

    if (job.per_job_paid) {
      return { already_paid: true, approve_url: null, order_id: job.paypal_order_id };
    }
    const amount = Number(job.customer_price ?? 0);
    if (!(amount > 0)) throw new Error("מחיר משלוח לא תקין — לא ניתן ליצור תשלום");

    let billing = data.billing_address;
    if (!billing) {
      const me = await nestServerFetch<{
        address?: string | null;
        city?: string | null;
        pickup_address?: string | null;
      }>("/api/accounts/customers/me", { accessToken: context.accessToken });
      billing = billingFromCustomer(me);
    }

    paypalLog("per_job_order_start", {
      job_id: job.id,
      attach_paypal_wallet: data.attach_paypal_wallet !== false,
      has_billing: !!billing,
    }, "info");
    try {
      const { createCheckoutOrder } = await import("@/lib/paypal/client.server");
      const order = await createCheckoutOrder({
        amount: amount.toFixed(2),
        currency: "ILS",
        invoice_id: `goi-job-${job.id}`,
        description: `Goi משלוח ${job.job_number ?? job.id.slice(0, 8)}`,
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        billing_address: billing,
        attach_paypal_wallet: data.attach_paypal_wallet,
      });
      const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");

      await nestServerFetch(`/api/jobs/${job.id}`, {
        accessToken: context.accessToken,
        method: "PATCH",
        body: { paypal_order_id: order.id, per_job_amount: amount },
      });
      paypalLog("per_job_order_ok", { job_id: job.id, order_id: order.id }, "info");
      return { already_paid: false, approve_url: approve?.href ?? null, order_id: order.id };
    } catch (e: unknown) {
      paypalLog("per_job_order_fail", { job_id: job.id, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });

export const capturePerJobOrderFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    job_id: z.string().uuid(),
    order_id: z.string().min(4),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const job = await nestServerFetch<{
      id: string;
      customer_id: string;
      customer_price: number | null;
      per_job_paid: boolean;
      paypal_order_id: string | null;
    }>(`/api/jobs/${data.job_id}`, { accessToken: context.accessToken });

    if (job.per_job_paid) return { ok: true, already: true };
    if (job.paypal_order_id && job.paypal_order_id !== data.order_id) {
      throw new Error("Order mismatch");
    }

    paypalLog("per_job_capture_start", { job_id: job.id, order_id: data.order_id }, "info");
    try {
      const { captureOrder } = await import("@/lib/paypal/client.server");
      const captured = await captureOrder(data.order_id);
      const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
      if (cap?.status !== "COMPLETED") {
        paypalLog("per_job_capture_fail", { job_id: job.id, capture_status: cap?.status ?? null });
        const { paypalErrorHe } = await import("@/lib/paypal-errors");
        throw new Error(paypalErrorHe({ details: [{ issue: cap?.status ?? "CAPTURE_FAILED" }] }));
      }

      await nestServerFetch("/api/payments/per-job/capture", {
        accessToken: context.accessToken,
        method: "POST",
        body: {
          job_id: job.id,
          order_id: data.order_id,
          capture_id: cap.id,
        },
      });
      paypalLog("per_job_capture_ok", { job_id: job.id, capture_id: cap.id }, "info");
      return { ok: true };
    } catch (e: unknown) {
      paypalLog("per_job_capture_fail", { job_id: job.id, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });

export const logPaypalClientFn = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    event: z.string().min(2).max(80),
    message: z.string().max(1000).optional(),
    debug_id: z.string().max(80).optional(),
    extra: z.record(z.string(), z.unknown()).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    paypalLog(`client_${data.event}`, {
      message: data.message ?? null,
      debug_id: data.debug_id ?? null,
      extra: data.extra ?? null,
    });
    return { ok: true };
  });
