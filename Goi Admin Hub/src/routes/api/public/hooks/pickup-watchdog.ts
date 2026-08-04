import { createFileRoute } from "@tanstack/react-router";
import { AppError, withHandler } from "@/lib/server-errors";

export const Route = createFileRoute("/api/public/hooks/pickup-watchdog")({
  server: {
    handlers: {
      POST: withHandler(
        "api.public.pickup-watchdog",
        async (ctx: { request: Request }) => {
          const provided = ctx.request.headers.get("apikey") ?? "";
          const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
          if (!expected || provided !== expected) {
            throw new AppError("unauthorized");
          }
          const { runPickupWatchdog } = await import("@/lib/pickup-watchdog.server");
          const result = await runPickupWatchdog();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            headers: { "Content-Type": "application/json", "cache-control": "no-store" },
          });
        },
      ),
    },
  },
});
