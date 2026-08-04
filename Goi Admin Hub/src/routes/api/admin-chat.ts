import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";

export const Route = createFileRoute("/api/admin-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.replace(/^Bearer\s+/i, "").trim();
          if (!token) return new Response("Unauthorized", { status: 401 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          // Verify admin
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userRes?.user) return new Response("Unauthorized", { status: 401 });
          const userId = userRes.user.id;

          const { data: role } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (!role) return new Response("Forbidden", { status: 403 });

          const body = (await request.json()) as { messages?: UIMessage[]; threadId?: string };
          const messages = body.messages;
          const threadId = body.threadId;
          if (!Array.isArray(messages) || !threadId) {
            return new Response("Invalid body", { status: 400 });
          }

          // Verify thread ownership
          const { data: thread } = await supabaseAdmin
            .from("admin_chat_threads")
            .select("id, owner_id, title")
            .eq("id", threadId)
            .maybeSingle();
          if (!thread || thread.owner_id !== userId) {
            return new Response("Thread not found", { status: 404 });
          }

          const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
          const { adminAssistantTools, ADMIN_ASSISTANT_SYSTEM_PROMPT } = await import(
            "@/lib/admin-assistant/tools.server"
          );

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          // Persist incoming user message(s) that aren't saved yet
          const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
          if (lastUserMsg) {
            // Check if already saved by AI-SDK-id reference (parts hash); simple approach: save unconditionally
            await supabaseAdmin.from("admin_chat_messages").insert({
              thread_id: threadId,
              role: "user",
              parts: lastUserMsg.parts as never,
            });

            // Set first message as thread title
            const text = lastUserMsg.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join(" ")
              .trim();
            if (text && (thread.title === "שיחה חדשה" || !thread.title)) {
              const title = text.slice(0, 60);
              await supabaseAdmin
                .from("admin_chat_threads")
                .update({ title, last_message_at: new Date().toISOString() })
                .eq("id", threadId);
            } else {
              await supabaseAdmin
                .from("admin_chat_threads")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", threadId);
            }
          }

          const result = streamText({
            model,
            system: ADMIN_ASSISTANT_SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages),
            tools: adminAssistantTools,
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              try {
                await supabaseAdmin.from("admin_chat_messages").insert({
                  thread_id: threadId,
                  role: "assistant",
                  parts: responseMessage.parts as never,
                });
                await supabaseAdmin
                  .from("admin_chat_threads")
                  .update({ last_message_at: new Date().toISOString() })
                  .eq("id", threadId);
              } catch (e) {
                console.error("Failed to save assistant message", e);
              }
            },
          });
        } catch (e) {
          console.error("[api.admin-chat] error:", e);
          return new Response(
            JSON.stringify({ error: { code: "internal", message: "אירעה שגיאה בעוזר. נסה שוב." } }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
