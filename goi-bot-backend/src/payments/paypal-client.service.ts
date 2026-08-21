import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const BASE_LIVE = "https://api-m.paypal.com";
const BASE_SANDBOX = "https://api-m.sandbox.paypal.com";

export type PaypalCheckoutOrder = {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
};

export type PaypalCaptureResult = {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
};

/**
 * PayPal REST client — OAuth2, checkout orders, capture, and webhook verify.
 * Ported from goi-bot-frontend/src/lib/paypal/client.server.ts (subset).
 */
@Injectable()
export class PaypalClientService {
  private readonly logger = new Logger(PaypalClientService.name);
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get<string>("paypal.clientId") && this.config.get<string>("paypal.clientSecret")
    );
  }

  private baseUrl(): string {
    return this.config.get<string>("paypal.mode") === "live" ? BASE_LIVE : BASE_SANDBOX;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - 60_000 > now) {
      return this.cachedToken.token;
    }
    const id = this.config.get<string>("paypal.clientId");
    const secret = this.config.get<string>("paypal.clientSecret");
    if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured");

    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch(`${this.baseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
    return json.access_token;
  }

  private async call<T = unknown>(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (init.idempotencyKey) headers["PayPal-Request-Id"] = init.idempotencyKey;
    const res = await fetch(`${this.baseUrl()}${path}`, { ...init, headers });
    const text = await res.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      const rec = body && typeof body === "object" ? (body as { message?: string; debug_id?: string; name?: string; details?: unknown }) : null;
      this.logger.error(
        JSON.stringify({
          tag: "paypal",
          event: "api_error",
          path,
          status: res.status,
          name: rec?.name,
          message: rec?.message,
          debug_id: rec?.debug_id,
          details: rec?.details,
        }),
      );
      throw new Error(`PayPal ${path} ${res.status}: ${rec?.message ?? text}`);
    }
    this.logger.log(JSON.stringify({ tag: "paypal", event: "api_ok", path, status: res.status }));
    return body as T;
  }

  /**
   * One-time checkout order (intent CAPTURE). Optional return/cancel URLs
   * attach PayPal experience_context for redirect flows; JS SDK only needs `id`.
   */
  async createCheckoutOrder(input: {
    amount: string;
    currency: string;
    invoice_id: string;
    description?: string;
    return_url?: string;
    cancel_url?: string;
  }): Promise<PaypalCheckoutOrder> {
    const purchaseUnit: Record<string, unknown> = {
      invoice_id: input.invoice_id,
      description: input.description?.slice(0, 127),
      amount: { currency_code: input.currency, value: input.amount },
    };
    const body: Record<string, unknown> = {
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
    };
    if (input.return_url && input.cancel_url) {
      body.payment_source = {
        paypal: {
          experience_context: {
            return_url: input.return_url,
            cancel_url: input.cancel_url,
            brand_name: "Goi",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            landing_page: "LOGIN",
          },
        },
      };
    }
    return this.call<PaypalCheckoutOrder>("/v2/checkout/orders", {
      method: "POST",
      idempotencyKey: input.invoice_id,
      body: JSON.stringify(body),
    });
  }

  async captureOrder(orderId: string): Promise<PaypalCaptureResult> {
    return this.call<PaypalCaptureResult>(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      idempotencyKey: `cap-${orderId}`,
    });
  }

  /**
   * Verifies a webhook event against PAYPAL_WEBHOOK_ID via PayPal's
   * verify-webhook-signature API. Returns false (not throws) when PayPal
   * credentials or PAYPAL_WEBHOOK_ID are missing so the caller can decide
   * whether to still persist the (unverified) event.
   */
  async verifyWebhookSignature(headers: {
    "paypal-auth-algo"?: string;
    "paypal-cert-url"?: string;
    "paypal-transmission-id"?: string;
    "paypal-transmission-sig"?: string;
    "paypal-transmission-time"?: string;
  }, webhookEvent: unknown): Promise<boolean> {
    const webhookId = this.config.get<string>("paypal.webhookId");
    if (!webhookId || !this.isConfigured()) return false;

    const authAlgo = headers["paypal-auth-algo"];
    const certUrl = headers["paypal-cert-url"];
    const transmissionId = headers["paypal-transmission-id"];
    const transmissionSig = headers["paypal-transmission-sig"];
    const transmissionTime = headers["paypal-transmission-time"];
    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return false;
    }

    try {
      const result = await this.call<{ verification_status: string }>(
        "/v1/notifications/verify-webhook-signature",
        {
          method: "POST",
          body: JSON.stringify({
            auth_algo: authAlgo,
            cert_url: certUrl,
            transmission_id: transmissionId,
            transmission_sig: transmissionSig,
            transmission_time: transmissionTime,
            webhook_id: webhookId,
            webhook_event: webhookEvent,
          }),
        },
      );
      return result.verification_status === "SUCCESS";
    } catch (e) {
      this.logger.error("verify-webhook-signature error", e instanceof Error ? e.stack : e);
      return false;
    }
  }
}
