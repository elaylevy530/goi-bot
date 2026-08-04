/**
 * PayPal webhook receiver. Verifies signature against PAYPAL_WEBHOOK_ID,
 * stores raw event for idempotency, and updates billing_records / paypal_payouts.
 *
 * Public endpoint (auth bypass) — security is the signature check.
 * Configure this URL in PayPal developer dashboard:
 *   https://goi-bot.lovable.app/api/public/paypal-webhook
 */
import { createFileRoute } from "@tanstack/react-router";

type PayPalEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  resource?: Record<string, unknown>;
};

export const Route = createFileRoute("/api/public/paypal-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { verifyWebhookSignature } = await import("@/lib/paypal/client.server");

        let event: PayPalEvent;
        try { event = JSON.parse(rawBody) as PayPalEvent; }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        // Idempotency: skip duplicates
        const { data: existing } = await supabaseAdmin
          .from("paypal_webhook_events")
          .select("id, processed_at")
          .eq("event_id", event.id)
          .maybeSingle();
        if (existing && (existing as { processed_at?: string | null }).processed_at) {
          return new Response("already-processed", { status: 200 });
        }

        const verified = await verifyWebhookSignature({ headers: request.headers, rawBody }).catch(() => false);

        if (!existing) {
          await supabaseAdmin.from("paypal_webhook_events").insert({
            event_id: event.id,
            event_type: event.event_type,
            resource_type: event.resource_type ?? null,
            resource_id: (event.resource as { id?: string } | undefined)?.id ?? null,
            payload: event as unknown as Record<string, unknown>,
            verified,
          } as never);
        }

        if (!verified) return new Response("invalid-signature", { status: 401 });

        try {
          const resource = event.resource ?? {};
          switch (event.event_type) {
            case "PAYMENT.CAPTURE.COMPLETED":
            case "PAYMENT.CAPTURE.DENIED":
            case "PAYMENT.CAPTURE.REFUNDED":
            case "PAYMENT.CAPTURE.REVERSED": {
              const captureId = (resource as { id?: string }).id;
              const status = (resource as { status?: string }).status;
              const invoiceId = (resource as { invoice_id?: string }).invoice_id;
              const recordId = invoiceId?.startsWith("goi-") ? invoiceId.slice(4) : null;
              if (recordId) {
                const billingStatus =
                  event.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "paid" :
                  event.event_type === "PAYMENT.CAPTURE.REFUNDED" || event.event_type === "PAYMENT.CAPTURE.REVERSED" ? "cancelled" :
                  "open";
                await supabaseAdmin
                  .from("billing_records")
                  .update({
                    paypal_capture_id: captureId ?? null,
                    status: (status ?? "").toLowerCase() || "pending",
                    billing_status: billingStatus,
                    provider: "paypal",
                  } as never)
                  .eq("id", recordId);
              }
              break;
            }
            case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
            case "PAYMENT.PAYOUTS-ITEM.FAILED":
            case "PAYMENT.PAYOUTS-ITEM.RETURNED":
            case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": {
              const itemId = (resource as { payout_item_id?: string }).payout_item_id ?? (resource as { id?: string }).id;
              const senderItemId = (resource as { payout_item?: { sender_item_id?: string } }).payout_item?.sender_item_id;
              const status =
                event.event_type === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED" ? "succeeded" :
                event.event_type === "PAYMENT.PAYOUTS-ITEM.FAILED" ? "failed" :
                event.event_type === "PAYMENT.PAYOUTS-ITEM.RETURNED" ? "returned" : "unclaimed";
              if (senderItemId) {
                await supabaseAdmin
                  .from("paypal_payouts")
                  .update({ status, paypal_payout_item_id: itemId ?? null } as never)
                  .eq("sender_batch_id", senderItemId);
              }
              break;
            }
            case "VAULT.PAYMENT-TOKEN.DELETED": {
              const tokenId = (resource as { id?: string }).id;
              if (tokenId) {
                await supabaseAdmin
                  .from("customers")
                  .update({
                    payment_method_on_file: false,
                    paypal_vault_id: null,
                    dispatch_blocked_reason: "אמצעי התשלום הוסר",
                  } as never)
                  .eq("paypal_vault_id", tokenId);
              }
              break;
            }
            default: break;
          }
          await supabaseAdmin
            .from("paypal_webhook_events")
            .update({ processed_at: new Date().toISOString() } as never)
            .eq("event_id", event.id);
        } catch (e) {
          await supabaseAdmin
            .from("paypal_webhook_events")
            .update({ error_message: (e as Error).message } as never)
            .eq("event_id", event.id);
          return new Response("processing-error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
