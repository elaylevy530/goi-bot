import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validate Meta's X-Hub-Signature-256 header against the raw request body.
 * Returns true when no app secret is configured (development) — set
 * WHATSAPP_CLOUD_APP_SECRET in production so unsigned requests are rejected.
 */
export function verifyCloudSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | undefined,
): boolean {
  if (!appSecret) return true;
  if (!signatureHeader) return false;
  const expectedHex = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const hex = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(hex);
  const b = Buffer.from(expectedHex);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Normalize a Meta Cloud API webhook payload into the Green-API-style shape
 * so a single downstream handler understands both providers.
 * Ported from goi-bot-frontend/src/lib/whatsapp/cloud-api.server.ts.
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
