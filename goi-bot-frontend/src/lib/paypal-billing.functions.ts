/**
 * Server functions for PayPal-based billing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

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
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({ setup_token_id: z.string().min(8) }).parse(d))
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
    const pm = await createPaymentToken(data.setup_token_id);
    const isPaypal = !!pm.payment_source.paypal;
    const brand = isPaypal ? "PayPal" : (pm.payment_source.card?.brand ?? "Card");
    const last4 = isPaypal ? null : (pm.payment_source.card?.last_digits ?? null);

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
      },
    });
    return { ok: true, brand, last4 };
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

    const biz = await nestServerFetch<{ paypal_vault_id?: string | null; business_name?: string | null }>(
      `/api/accounts/customers/${rec.business_id}`,
      { accessToken: context.accessToken },
    );
    const vaultId = biz?.paypal_vault_id;
    if (!vaultId) throw new Error("Business has no PayPal vault token");

    const invoiceId = `goi-${rec.id}`;
    const order = await createOrderWithVault({
      vault_id: vaultId,
      amount: Number(rec.customer_price).toFixed(2),
      currency: "ILS",
      invoice_id: invoiceId,
      description: `Goi משלוח ${rec.job_number ?? rec.id.slice(0, 8)}`,
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

    const { createCheckoutOrder } = await import("@/lib/paypal/client.server");
    const order = await createCheckoutOrder({
      amount: amount.toFixed(2),
      currency: "ILS",
      invoice_id: `goi-job-${job.id}`,
      description: `Goi משלוח ${job.job_number ?? job.id.slice(0, 8)}`,
      return_url: data.return_url,
      cancel_url: data.cancel_url,
    });
    const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");

    await nestServerFetch(`/api/jobs/${job.id}`, {
      accessToken: context.accessToken,
      method: "PATCH",
      body: { paypal_order_id: order.id, per_job_amount: amount },
    });

    return { already_paid: false, approve_url: approve?.href ?? null, order_id: order.id };
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

    const { captureOrder } = await import("@/lib/paypal/client.server");
    const captured = await captureOrder(data.order_id);
    const cap = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (cap?.status !== "COMPLETED") {
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

    return { ok: true };
  });
