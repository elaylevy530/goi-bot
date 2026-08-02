import { createFileRoute } from "@tanstack/react-router";
import { logError } from "@/lib/server-errors";

/**
 * Compatibility shim: auth-check then forward drain to Nest
 * (`POST /api/public/notification-queue-worker` + CronSecretGuard).
 *
 * In Vite dev, this path is proxied to Nest directly (see vite.config.ts).
 * Prefer hitting Nest when possible; this route remains so existing cron/webhook
 * consumers pointed at the TanStack origin keep working.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  X-Cron-Secret: <CRON_SECRET>
 * Batch size: hard cap MAX_BATCH=50 regardless of caller.
 */
const MAX_BATCH = 50;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const auth = request.headers.get("authorization") || "";
  const xcs = request.headers.get("x-cron-secret") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return bearer === secret || xcs === secret;
}

export const Route = createFileRoute("/api/public/notification-queue-worker")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { drainNotificationQueue } = await import("@/lib/whatsapp/notification-queue.server");
          const summary = await drainNotificationQueue(MAX_BATCH);
          // Minimal summary only — never expose queue contents.
          return new Response(
            JSON.stringify({ ok: true, processed: summary.processed, sent: summary.sent, failed: summary.failed, dead: summary.dead }),
            { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
          );
        } catch (e) {
          logError("notif-queue-worker", e);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }
      },
      POST: async ({ request }) => {
        // alias POST so external schedulers can use either verb
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const { drainNotificationQueue } = await import("@/lib/whatsapp/notification-queue.server");
        const s = await drainNotificationQueue(MAX_BATCH);
        return new Response(JSON.stringify({ ok: true, ...s }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
