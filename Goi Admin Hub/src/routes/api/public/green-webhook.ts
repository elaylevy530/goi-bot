import { createFileRoute } from "@tanstack/react-router";
import { logError } from "@/lib/server-errors";


/**
 * Green API inbound webhook.
 *
 * Configure in Green API console → Settings:
 *   webhookUrl: https://goi-bot.lovable.app/api/public/green-webhook
 *   incomingWebhook: yes
 */
export const Route = createFileRoute("/api/public/green-webhook")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, info: "Green API webhook live" }), {
          headers: { "Content-Type": "application/json" },
        }),
      POST: async ({ request }) => {
        let rawBody: Record<string, unknown> = {};
        let eventId: string | null = null;
        try {
          rawBody = (await request.json()) as Record<string, unknown>;
        } catch (e) {
          logError("green-webhook.parse", e);
          return new Response("ok", { status: 200 });
        }

        // Provider-neutral idempotency check first — duplicates short-circuit.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const externalId = (rawBody.idMessage as string) ?? null;
          if (externalId) {
            const { data: reg } = await supabaseAdmin.rpc("register_webhook_event", {
              _provider: "green",
              _external_id: externalId,
              _event_type: (rawBody.typeWebhook as string) ?? null,
              _payload: rawBody as any,
            });
            const r = reg as { id?: string; duplicate?: boolean } | null;
            if (r?.duplicate) {
              return new Response("ok-duplicate", { status: 200 });
            }
          }
        } catch (e) {
          logError("green-webhook.idem", e);
        }

        // ALWAYS log first, then process.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const md = (rawBody.messageData ?? {}) as Record<string, any>;
          const sd = (rawBody.senderData ?? {}) as Record<string, any>;
          // Defensive scan for buttonId/text in every known location
          const buttonId =
            md.buttonsResponseMessage?.selectedButtonId ??
            md.templateButtonReplyMessage?.selectedId ??
            md.interactiveButtonsReplyMessage?.selectedButtonId ??
            md.interactiveButtonsResponseMessage?.selectedButtonId ??
            md.interactiveButtonsResponse?.selectedButtonId ??
            md.interactiveButtonsResponse?.selectedId ??
            md.interactiveResponseMessage?.selectedButtonId ??
            md.interactiveButtons?.selectedButtonId ??
            md.quickReplyButtonsResponseMessage?.selectedButtonId ??
            md.listResponseMessage?.singleSelectReply?.selectedRowId ??
            null;
          const buttonText =
            md.buttonsResponseMessage?.selectedButtonText ??
            md.templateButtonReplyMessage?.selectedDisplayText ??
            md.interactiveButtonsReplyMessage?.selectedButtonText ??
            md.interactiveButtonsResponseMessage?.selectedButtonText ??
            md.interactiveButtonsResponse?.selectedButtonText ??
            md.interactiveButtonsResponse?.selectedDisplayText ??
            md.interactiveResponseMessage?.selectedButtonText ??
            md.quickReplyButtonsResponseMessage?.selectedButtonText ??
            md.listResponseMessage?.singleSelectReply?.title ??
            md.textMessageData?.textMessage ??
            md.extendedTextMessageData?.text ??
            null;
          const chatId = sd.chatId ?? sd.sender ?? null;
          const phoneMatch = typeof chatId === "string" ? chatId.match(/^(\d+)@/) : null;
          const senderPhone = phoneMatch ? phoneMatch[1] : null;

          // Record inbound for service-window tracking (24h).
          if (senderPhone && (rawBody.typeWebhook as string) === "incomingMessageReceived") {
            const { recordInboundMessage } = await import("@/lib/whatsapp/service-window.server");
            await recordInboundMessage(senderPhone, "green");
          }

          const { data: inserted } = await supabaseAdmin
            .from("green_api_webhook_events")
            .insert({
              external_message_id: (rawBody.idMessage as string) ?? null,
              type_webhook: (rawBody.typeWebhook as string) ?? null,
              type_message: (md.typeMessage as string) ?? null,
              sender_chat_id: chatId,
              sender_phone: senderPhone,
              button_id: buttonId,
              button_text: buttonText,
              raw_payload: rawBody as any,
              processing_status: "received",
            })
            .select("id")
            .maybeSingle();
          eventId = inserted?.id ?? null;
        } catch (e) {
          logError("green-webhook.log", e);
        }

        try {
          const { handleGreenWebhook } = await import("@/lib/green-webhook-handler.server");
          await handleGreenWebhook(rawBody, eventId ?? undefined);
          if (eventId) {
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              await supabaseAdmin
                .from("green_api_webhook_events")
                .update({ processing_status: "completed", processed_at: new Date().toISOString() })
                .eq("id", eventId)
                .eq("processing_status", "processing");
            } catch {}
          }
        } catch (err) {
          logError("green-webhook.handler", err);
          if (eventId) {
            try {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
        return new Response("ok", { status: 200 });
      },
    },
  },
});
