/**
 * Meta WhatsApp Cloud API client — server only.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Required env (set via add_secret when going live):
 *   WHATSAPP_CLOUD_PHONE_NUMBER_ID    — numeric ID of the sending number
 *   WHATSAPP_CLOUD_ACCESS_TOKEN       — permanent system-user access token
 *   WHATSAPP_CLOUD_VERIFY_TOKEN       — arbitrary string used for webhook verification
 *   WHATSAPP_CLOUD_APP_SECRET         — (recommended) for X-Hub-Signature-256 validation
 *   WHATSAPP_CLOUD_API_VERSION        — optional, defaults to v21.0
 */

type ButtonRow = { buttonId: string; buttonText: string };

export function cloudCreds() {
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_CLOUD_API_VERSION || "v21.0";
  if (!phoneId || !token) throw new Error("WhatsApp Cloud API credentials missing");
  return { phoneId, token, version, base: `https://graph.facebook.com/${version}` };
}

/** Convert local phone (e.g. 0501234567, +972501234567) to E.164 digits only (no +). */
export function toE164(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!p.startsWith("972") && p.length === 9) p = "972" + p;
  return p;
}

async function postMessage(body: Record<string, unknown>, timeoutMs = 8000) {
  const { phoneId, token, base } = cloudCreds();
  const url = `${base}/${phoneId}/messages`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`WhatsApp Cloud ${res.status}: ${text.slice(0, 400)}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(t);
  }
}

export async function cloudSendText(phone: string, message: string) {
  return postMessage({
    to: toE164(phone),
    type: "text",
    text: { body: message, preview_url: false },
  });
}

/**
 * Up to 3 native quick-reply buttons.
 * Outside the 24-hour customer-care window you must send an approved template
 * instead — that's handled by cloudSendTemplate().
 */
export async function cloudSendButtons(
  phone: string,
  message: string,
  buttons: ButtonRow[],
  footer?: string,
) {
  const btn3 = buttons.slice(0, 3);
  return postMessage({
    to: toE164(phone),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: message.slice(0, 1024) },
      ...(footer ? { footer: { text: footer.slice(0, 60) } } : {}),
      action: {
        buttons: btn3.map((b) => ({
          type: "reply",
          reply: { id: b.buttonId.slice(0, 256), title: b.buttonText.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * Send an approved message template (required for the first outbound message
 * or any message outside the 24h customer-care window).
 */
export async function cloudSendTemplate(
  phone: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[] = [],
) {
  return postMessage({
    to: toE164(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length
        ? [
            {
              type: "body",
              parameters: bodyParams.map((p) => ({ type: "text", text: p })),
            },
          ]
        : [],
    },
  });
}

/**
 * Validate Meta's X-Hub-Signature-256 header against the raw request body.
 * Returns true when no APP_SECRET is configured (development) — set it in
 * production so unsigned requests are rejected.
 */
export async function verifyCloudSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.WHATSAPP_CLOUD_APP_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;
  const expected = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * Normalize a Meta Cloud API webhook payload into the Green-API-style shape
 * that the existing green-webhook-handler.server.ts already understands.
 * This keeps the entire downstream flow (bot state machine, button routing,
 * status transitions) unchanged.
 */
export function normalizeCloudWebhookToGreen(payload: any): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      for (const m of messages) {
        const from: string = m.from || "";
        const chatId = `${from}@c.us`;
        const base: Record<string, unknown> = {
          typeWebhook: "incomingMessageReceived",
          idMessage: m.id,
          timestamp: Number(m.timestamp) || Math.floor(Date.now() / 1000),
          senderData: {
            chatId,
            sender: chatId,
            chatName: value.contacts?.[0]?.profile?.name ?? "",
            senderName: value.contacts?.[0]?.profile?.name ?? "",
          },
        };

        if (m.type === "text") {
          base.messageData = {
            typeMessage: "textMessage",
            textMessageData: { textMessage: m.text?.body ?? "" },
          };
        } else if (m.type === "interactive") {
          const i = m.interactive ?? {};
          if (i.type === "button_reply") {
            base.messageData = {
              typeMessage: "buttonsResponseMessage",
              buttonsResponseMessage: {
                selectedButtonId: i.button_reply?.id ?? "",
                selectedButtonText: i.button_reply?.title ?? "",
              },
            };
          } else if (i.type === "list_reply") {
            base.messageData = {
              typeMessage: "listResponseMessage",
              listResponseMessage: {
                singleSelectReply: {
                  selectedRowId: i.list_reply?.id ?? "",
                  title: i.list_reply?.title ?? "",
                },
              },
            };
          } else {
            base.messageData = { typeMessage: "interactiveResponseMessage" };
          }
        } else if (m.type === "button") {
          base.messageData = {
            typeMessage: "buttonsResponseMessage",
            buttonsResponseMessage: {
              selectedButtonId: m.button?.payload ?? "",
              selectedButtonText: m.button?.text ?? "",
            },
          };
        } else {
          base.messageData = {
            typeMessage: m.type ?? "unknownMessage",
            textMessageData: { textMessage: "" },
          };
        }
        out.push(base);
      }
    }
  }
  return out;
}

export function isCloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID && process.env.WHATSAPP_CLOUD_ACCESS_TOKEN);
}
