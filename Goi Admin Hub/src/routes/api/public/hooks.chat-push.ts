import { createFileRoute } from "@tanstack/react-router";

/**
 * Internal webhook called by the DB trigger `tg_notify_chat_message_push` on
 * every new row inserted into `public.messages`. Sends a Web Push to the
 * recipient (business or courier) so they see chat activity even when the
 * app is closed. Bearer token must match `process.env.CHAT_PUSH_TOKEN`.
 */
export const Route = createFileRoute("/api/public/hooks/chat-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.CHAT_PUSH_TOKEN;
        if (!token) return new Response("Not configured", { status: 503 });

        const auth = request.headers.get("authorization") || "";
        const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (bearer !== token) return new Response("Unauthorized", { status: 401 });

        let payload: {
          kind?: string;
          conversation_id?: string;
          sender_role?: "courier" | "business" | "admin";
          body_preview?: string;
        };
        try {
          payload = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        if (payload?.kind !== "conversation_message" || !payload.conversation_id || !payload.sender_role) {
          return new Response("Bad payload", { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { sendPushBatch } = await import("@/lib/push/send.server");

          const { data: conv } = await supabaseAdmin
            .from("conversations")
            .select("id, kind, courier_id, business_id, job_id, courier:couriers(full_name), business:customers(name)")
            .eq("id", payload.conversation_id)
            .maybeSingle();
          if (!conv) return new Response("ok", { status: 200 });

          const c = conv as unknown as {
            id: string;
            kind: "courier_support" | "business_support" | "courier_business";
            courier_id: string | null;
            business_id: string | null;
            job_id: string | null;
            courier: { full_name: string | null } | null;
            business: { name: string | null } | null;
          };

          // Only per-job chat gets push. Support chats are handled elsewhere.
          if (c.kind !== "courier_business") return new Response("ok", { status: 200 });

          const bodyPreview = (payload.body_preview ?? "").trim() || "הודעה חדשה";
          const senderName =
            payload.sender_role === "courier"
              ? c.courier?.full_name ?? "השליח"
              : payload.sender_role === "business"
                ? c.business?.name ?? "בית העסק"
                : "תמיכה";

          // Recipient is the other side of the chat
          const notifyBusiness = payload.sender_role !== "business" && !!c.business_id;
          const notifyCourier = payload.sender_role !== "courier" && !!c.courier_id;

          const jobs: Promise<unknown>[] = [];

          if (notifyBusiness) {
            const { data: subs } = await supabaseAdmin
              .from("business_push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("business_id", c.business_id!);
            if (subs?.length) {
              jobs.push(
                sendPushBatch(subs as never, {
                  title: `הודעה מ${senderName}`,
                  body: bodyPreview,
                  url: `/business/messages?conv=${c.id}`,
                  tag: `chat-${c.id}`,
                }).then(async (results) => {
                  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
                  if (gone.length)
                    await supabaseAdmin.from("business_push_subscriptions").delete().in("endpoint", gone);
                }),
              );
            }
          }

          if (notifyCourier) {
            const { data: subs } = await supabaseAdmin
              .from("courier_push_subscriptions")
              .select("endpoint, p256dh, auth")
              .eq("courier_id", c.courier_id!);
            if (subs?.length) {
              jobs.push(
                sendPushBatch(subs as never, {
                  title: `הודעה מ${senderName}`,
                  body: bodyPreview,
                  url: `/courier/messages?c=${c.id}`,
                  tag: `chat-${c.id}`,
                }).then(async (results) => {
                  const gone = results.filter((r) => r.gone).map((r) => r.endpoint);
                  if (gone.length)
                    await supabaseAdmin.from("courier_push_subscriptions").delete().in("endpoint", gone);
                }),
              );
            }
          }

          await Promise.allSettled(jobs);
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[chat-push] error", e);
          return new Response("ok", { status: 200 }); // never fail the DB trigger
        }
      },
    },
  },
});
