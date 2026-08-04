import { createFileRoute } from "@tanstack/react-router";
import { logError } from "@/lib/server-errors";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * Configure in Meta App Dashboard → WhatsApp → Configuration:
 *   Callback URL:  https://goi-bot.lovable.app/api/public/whatsapp-cloud-webhook
 *   Verify Token:  matches WHATSAPP_CLOUD_VERIFY_TOKEN secret
 *   Subscribe to:  messages
 *
 * GET  — verification handshake (hub.mode=subscribe).
 * POST — inbound messages; payload is normalized to the Green-API shape
 *        and passed to the existing handler so the entire bot flow keeps working.
 */
export const Route = createFileRoute("/api/public/whatsapp-cloud-webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, { status: 200 });
        }
        return new Response(
          JSON.stringify({ ok: true, info: "WhatsApp Cloud webhook live" }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        try {
          const { verifyCloudSignature, normalizeCloudWebhookToGreen } = await import(
            "@/lib/whatsapp/cloud-api.server"
          );
          const ok = await verifyCloudSignature(raw, signature);
          if (!ok) {
            logError("whatsapp-cloud.signature", "invalid X-Hub-Signature-256");
            return new Response("invalid signature", { status: 401 });
          }

          let payload: unknown = {};
          try {
            payload = JSON.parse(raw);
          } catch (e) {
            logError("whatsapp-cloud.parse", e);
            return new Response("ok", { status: 200 });
          }

          const normalized = normalizeCloudWebhookToGreen(payload);
          if (normalized.length === 0) {
            return new Response("ok", { status: 200 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { handleGreenWebhook } = await import("@/lib/green-webhook-handler.server");
          const { recordInboundMessage } = await import("@/lib/whatsapp/service-window.server");

          for (const evt of normalized) {
            // Provider-neutral idempotency: skip if we've already processed this Meta event.
            const externalId = (evt.idMessage as string) || null;
            if (externalId) {
              const { data: reg } = await supabaseAdmin.rpc("register_webhook_event", {
                _provider: "cloud",
                _external_id: externalId,
                _event_type: (evt.typeWebhook as string) ?? null,
                _payload: evt as any,
              });
              if ((reg as { duplicate?: boolean } | null)?.duplicate) continue;
            }

            // 24h service-window tracking
            const sd = (evt.senderData ?? {}) as Record<string, any>;
            const phoneMatch = typeof sd.chatId === "string" ? sd.chatId.match(/^(\d+)@/) : null;
            if (phoneMatch) await recordInboundMessage(phoneMatch[1], "cloud");

            let eventId: string | null = null;
            try {
              const md = (evt.messageData ?? {}) as Record<string, any>;
              const sd = (evt.senderData ?? {}) as Record<string, any>;
              const chatId = sd.chatId ?? null;
              const phoneMatch = typeof chatId === "string" ? chatId.match(/^(\d+)@/) : null;
              const { data: inserted } = await supabaseAdmin
                .from("green_api_webhook_events")
                .insert({
                  external_message_id: (evt.idMessage as string) ?? null,
                  type_webhook: (evt.typeWebhook as string) ?? null,
                  type_message: (md.typeMessage as string) ?? null,
                  sender_chat_id: chatId,
                  sender_phone: phoneMatch ? phoneMatch[1] : null,
                  button_id:
                    md.buttonsResponseMessage?.selectedButtonId ??
                    md.listResponseMessage?.singleSelectReply?.selectedRowId ??
                    null,
                  button_text:
                    md.buttonsResponseMessage?.selectedButtonText ??
                    md.listResponseMessage?.singleSelectReply?.title ??
                    md.textMessageData?.textMessage ??
                    null,
                  raw_payload: evt as any,
                  processing_status: "received",
                })
                .select("id")
                .maybeSingle();
              eventId = inserted?.id ?? null;
            } catch (e) {
              logError("whatsapp-cloud.log", e);
            }

            try {
              await handleGreenWebhook(evt, eventId ?? undefined);
              if (eventId) {
                await supabaseAdmin
                  .from("green_api_webhook_events")
                  .update({
                    processing_status: "completed",
                    processed_at: new Date().toISOString(),
                  })
                  .eq("id", eventId)
                  .eq("processing_status", "processing");
              }
            } catch (err) {
              logError("whatsapp-cloud.handler", err);
              if (eventId) {
                try {
                  await supabaseAdmin
                    .from("green_api_webhook_events")
                    .update({
                      processing_status: "failed",
                      processing_error: err instanceof Error ? err.message : String(err),
                      processed_at: new Date().toISOString(),
                    })
                    .eq("id", eventId);
                } catch {}
              }
            }
          }
        } catch (err) {
          logError("whatsapp-cloud.fatal", err);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
