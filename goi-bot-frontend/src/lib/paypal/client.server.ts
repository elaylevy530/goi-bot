/**
 * PayPal Business REST API client (server-only).
 * Uses OAuth2 client_credentials. Supports sandbox + live via PAYPAL_MODE env.
 *
 * Env required:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_MODE         = "sandbox" | "live"   (default: "live")
 *   PAYPAL_WEBHOOK_ID   (for webhook signature verification)
 *
 * Env is read dynamically (process.env[name]) so Vite/Nitro cannot replace
 * missing build-time values with empty strings.
 */

import type { PaypalApiBillingAddress } from "@/lib/paypal-billing-address";
import { paypalErrorFields, paypalLog } from "@/lib/paypal-log";

const BASE_LIVE = "https://api-m.paypal.com";
const BASE_SANDBOX = "https://api-m.sandbox.paypal.com";

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function baseUrl(): string {
  return env("PAYPAL_MODE") === "sandbox" ? BASE_SANDBOX : BASE_LIVE;
}

function creds(): { id: string; secret: string } {
  const id = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured");
  return { id, secret };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;
  const { id, secret } = creds();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return json.access_token;
}

async function call<T = unknown>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) headers["PayPal-Request-Id"] = init.idempotencyKey;
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    paypalLog("api_error", {
      path,
      method: String(init.method ?? "GET"),
      status: res.status,
      ...paypalErrorFields(body),
    });
    const { paypalApiErrorMessage } = await import("@/lib/paypal-errors");
    throw new Error(paypalApiErrorMessage(body, `PayPal ${path} ${res.status}: ${text}`));
  }
  paypalLog("api_ok", { path, method: String(init.method ?? "GET"), status: res.status }, "info");
  return body as T;
}

// ---------- Vault: Setup Tokens & Payment Tokens ----------

/**
 * Create a setup token to be approved by the buyer.
 * For PayPal Wallet vaulting, the customer is redirected to approve.
 * For card vaulting, the card number is collected via PayPal hosted fields.
 */
export async function createSetupToken(input: {
  customer_id?: string;
  return_url: string;
  cancel_url: string;
  source: "paypal" | "card";
  billing_address?: PaypalApiBillingAddress;
}): Promise<{ id: string; status: string; links: Array<{ href: string; rel: string; method: string }> }> {
  const payment_source =
    input.source === "paypal"
      ? {
          paypal: {
            usage_type: "MERCHANT",
            ...(input.billing_address ? { address: input.billing_address } : {}),
            experience_context: {
              return_url: input.return_url,
              cancel_url: input.cancel_url,
              payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
              brand_name: "Goi",
              shipping_preference: "NO_SHIPPING",
              landing_page: "LOGIN",
              user_action: "CONTINUE",
            },
          },
        }
      : {
          // Docs: empty `card` — Card Fields attach PAN/billing on submit.
          // https://developer.paypal.com/docs/checkout/save-payment-methods/purchase-later/js-sdk/cards/
          card: {
            verification_method: "SCA_WHEN_REQUIRED",
            experience_context: {
              brand_name: "Goi",
              locale: "he-IL",
              return_url: input.return_url,
              cancel_url: input.cancel_url,
            },
          },
        };

  return call("/v3/vault/setup-tokens", {
    method: "POST",
    idempotencyKey: `setup-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    body: JSON.stringify({
      ...(input.customer_id
        ? input.source === "card"
          ? { customer: { merchant_customer_id: input.customer_id } }
          : { customer: { id: input.customer_id } }
        : {}),
      payment_source,
    }),
  });
}

/**
 * Exchange an approved setup token for a permanent payment token (vault id).
 */
export async function createPaymentToken(setupTokenId: string): Promise<{
  id: string;
  customer?: { id: string };
  payment_source: {
    paypal?: { email_address?: string; payer_id?: string };
    card?: { brand?: string; last_digits?: string };
  };
}> {
  return call("/v3/vault/payment-tokens", {
    method: "POST",
    idempotencyKey: `pmt-${setupTokenId}`,
    body: JSON.stringify({ payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } }),
  });
}

export async function deletePaymentToken(tokenId: string): Promise<void> {
  await call(`/v3/vault/payment-tokens/${tokenId}`, { method: "DELETE" });
}

// ---------- Orders: charge a saved vault token ----------

export async function createOrderWithVault(input: {
  vault_id: string;
  amount: string; // decimal string
  currency: string; // e.g. "ILS"
  invoice_id: string; // unique per charge (idempotency)
  description?: string;
  source?: "paypal" | "card";
}): Promise<{ id: string; status: string }> {
  const payment_source =
    input.source === "card"
      ? { card: { vault_id: input.vault_id } }
      : { paypal: { vault_id: input.vault_id } };
  return call("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.invoice_id,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: input.invoice_id,
          description: input.description?.slice(0, 127),
          amount: { currency_code: input.currency, value: input.amount },
        },
      ],
      payment_source,
    }),
  });
}

export async function captureOrder(orderId: string): Promise<{
  id: string;
  status: string;
  purchase_units: Array<{
    payments: { captures: Array<{ id: string; status: string; amount: { value: string; currency_code: string } }> };
  }>;
}> {
  return call(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    idempotencyKey: `cap-${orderId}`,
  });
}

/**
 * One-time checkout order — buyer must approve via the returned approval link.
 * Used for the "pay per delivery" flow when the business has no saved vault.
 */
export async function createCheckoutOrder(input: {
  amount: string;
  currency: string;
  invoice_id: string;
  description?: string;
  return_url: string;
  cancel_url: string;
  billing_address?: PaypalApiBillingAddress;
  /** Card Fields need a bare order. PayPal Buttons need payment_source.paypal. */
  attach_paypal_wallet?: boolean;
}): Promise<{ id: string; status: string; links: Array<{ href: string; rel: string; method: string }> }> {
  const body: Record<string, unknown> = {
    intent: "CAPTURE",
    purchase_units: [{
      invoice_id: input.invoice_id,
      description: input.description?.slice(0, 127),
      amount: { currency_code: input.currency, value: input.amount },
    }],
  };
  if (input.attach_paypal_wallet !== false) {
    const paypalSource: Record<string, unknown> = {
      experience_context: {
        return_url: input.return_url,
        cancel_url: input.cancel_url,
        brand_name: "Goi",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        landing_page: "LOGIN",
      },
    };
    if (input.billing_address) paypalSource.address = input.billing_address;
    body.payment_source = { paypal: paypalSource };
  }

  return call("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.invoice_id,
    body: JSON.stringify(body),
  });
}

// ---------- Payouts: send money to couriers ----------

export async function createPayout(input: {
  sender_batch_id: string;
  email_subject?: string;
  items: Array<{ recipient_email: string; amount: string; currency: string; note?: string; sender_item_id: string }>;
}): Promise<{ batch_header: { payout_batch_id: string; batch_status: string } }> {
  return call("/v1/payments/payouts", {
    method: "POST",
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: input.sender_batch_id,
        email_subject: input.email_subject ?? "תשלום מ-Goi",
        email_message: "תשלום עבור משלוחים שביצעת",
      },
      items: input.items.map((it) => ({
        recipient_type: "EMAIL",
        receiver: it.recipient_email,
        sender_item_id: it.sender_item_id,
        note: it.note ?? "תשלום עבור משלוחים",
        amount: { value: it.amount, currency: it.currency },
      })),
    }),
  });
}

// ---------- Webhook signature verification ----------

export async function verifyWebhookSignature(input: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const webhookId = env("PAYPAL_WEBHOOK_ID");
  if (!webhookId) return false;
  const h = input.headers;
  const payload = {
    auth_algo: h.get("paypal-auth-algo"),
    cert_url: h.get("paypal-cert-url"),
    transmission_id: h.get("paypal-transmission-id"),
    transmission_sig: h.get("paypal-transmission-sig"),
    transmission_time: h.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(input.rawBody),
  };
  if (!payload.auth_algo || !payload.cert_url || !payload.transmission_id || !payload.transmission_sig || !payload.transmission_time) {
    return false;
  }
  const result = await call<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result.verification_status === "SUCCESS";
}
