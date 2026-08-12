import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/version.json")({
  server: {
    handlers: {
      GET: async () => {
        const buildId = String(import.meta.env.VITE_APP_BUILD_ID ?? process.env.VITE_APP_BUILD_ID ?? "");
        return new Response(
          JSON.stringify({
            buildId,
            builtAt: new Date().toISOString(),
          }),
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          },
        );
      },
    },
  },
});
