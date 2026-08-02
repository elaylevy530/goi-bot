import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../accounts/entities/customer.entity";
import { BillingRecord } from "./entities/billing-record.entity";
import { PaypalPayout } from "./entities/paypal-payout.entity";
import { PaypalWebhookEvent } from "./entities/paypal-webhook-event.entity";
import { PaypalClientService } from "./paypal-client.service";

export type PayPalEvent = {
  id: string;
  event_type: string;
  resource_type?: string;
  resource?: Record<string, unknown>;
};

export type PaypalWebhookHeaders = {
  "paypal-auth-algo"?: string;
  "paypal-cert-url"?: string;
  "paypal-transmission-id"?: string;
  "paypal-transmission-sig"?: string;
  "paypal-transmission-time"?: string;
};

export type WebhookResult = { status: number; body: string };

/**
 * PayPal webhook processing. Ported from
 * goi-bot-frontend/src/routes/api/public/paypal-webhook.ts using TypeORM.
 *
 * Signature verification calls PayPal's verify-webhook-signature API when
 * PAYPAL_* env vars are configured; otherwise the event is still persisted
 * (verified=false) so nothing is silently dropped, but processing is skipped.
 */
@Injectable()
export class PaypalWebhookService {
  private readonly logger = new Logger(PaypalWebhookService.name);

  constructor(
    @InjectRepository(PaypalWebhookEvent)
    private readonly events: Repository<PaypalWebhookEvent>,
    @InjectRepository(PaypalPayout)
    private readonly payouts: Repository<PaypalPayout>,
    @InjectRepository(BillingRecord)
    private readonly billingRecords: Repository<BillingRecord>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    private readonly paypal: PaypalClientService,
  ) {}

  async handle(rawBody: string, headers: PaypalWebhookHeaders): Promise<WebhookResult> {
    let event: PayPalEvent;
    try {
      event = JSON.parse(rawBody) as PayPalEvent;
    } catch {
      return { status: 400, body: "Invalid JSON" };
    }

    const existing = await this.events.findOne({ where: { event_id: event.id } });
    if (existing?.processed_at) {
      return { status: 200, body: "already-processed" };
    }

    const verified = await this.paypal.verifyWebhookSignature(headers, event).catch(() => false);

    if (!existing) {
      await this.events.save(
        this.events.create({
          event_id: event.id,
          event_type: event.event_type,
          resource_type: event.resource_type ?? null,
          resource_id: (event.resource as { id?: string } | undefined)?.id ?? null,
          payload: event as unknown as Record<string, unknown>,
          verified,
        }),
      );
    }

    if (!verified) {
      return { status: 401, body: "invalid-signature" };
    }

    try {
      await this.processEvent(event);
      await this.events.update({ event_id: event.id }, { processed_at: new Date() });
    } catch (e) {
      this.logger.error("paypal webhook processing failed", e instanceof Error ? e.stack : e);
      await this.events.update({ event_id: event.id }, { error_message: (e as Error).message.slice(0, 2000) });
      return { status: 500, body: "processing-error" };
    }

    return { status: 200, body: "ok" };
  }

  private async processEvent(event: PayPalEvent): Promise<void> {
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
            event.event_type === "PAYMENT.CAPTURE.COMPLETED"
              ? "paid"
              : event.event_type === "PAYMENT.CAPTURE.REFUNDED" ||
                  event.event_type === "PAYMENT.CAPTURE.REVERSED"
                ? "cancelled"
                : "open";
          await this.billingRecords.update(recordId, {
            paypal_capture_id: captureId ?? null,
            status: (status ?? "").toLowerCase() || "pending",
            billing_status: billingStatus,
            provider: "paypal",
          });
        }
        break;
      }
      case "PAYMENT.PAYOUTS-ITEM.SUCCEEDED":
      case "PAYMENT.PAYOUTS-ITEM.FAILED":
      case "PAYMENT.PAYOUTS-ITEM.RETURNED":
      case "PAYMENT.PAYOUTS-ITEM.UNCLAIMED": {
        const itemId =
          (resource as { payout_item_id?: string }).payout_item_id ?? (resource as { id?: string }).id;
        const senderItemId = (resource as { payout_item?: { sender_item_id?: string } }).payout_item
          ?.sender_item_id;
        const status =
          event.event_type === "PAYMENT.PAYOUTS-ITEM.SUCCEEDED"
            ? "succeeded"
            : event.event_type === "PAYMENT.PAYOUTS-ITEM.FAILED"
              ? "failed"
              : event.event_type === "PAYMENT.PAYOUTS-ITEM.RETURNED"
                ? "returned"
                : "unclaimed";
        if (senderItemId) {
          await this.payouts.update(
            { sender_batch_id: senderItemId },
            { status, paypal_payout_item_id: itemId ?? null },
          );
        }
        break;
      }
      case "VAULT.PAYMENT-TOKEN.DELETED": {
        const tokenId = (resource as { id?: string }).id;
        if (tokenId) {
          await this.customers.update(
            { paypal_vault_id: tokenId },
            {
              payment_method_on_file: false,
              paypal_vault_id: null,
              dispatch_blocked_reason: "אמצעי התשלום הוסר",
            },
          );
        }
        break;
      }
      default:
        break;
    }
  }
}
