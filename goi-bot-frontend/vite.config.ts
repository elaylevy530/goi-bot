// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const nestTarget = process.env.VITE_API_URL || "http://localhost:3001";
const appBuildId =
  process.env.VITE_APP_BUILD_ID ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.COMMIT_REF ||
  process.env.GITHUB_SHA ||
  Date.now().toString(36);

process.env.VITE_APP_BUILD_ID = appBuildId;

function appVersionPlugin(buildId: string): Plugin {
  const payload = JSON.stringify({
    buildId,
    builtAt: new Date().toISOString(),
  });
  return {
    name: "goi-app-version",
    configureServer(server) {
      server.middlewares.use("/version.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.end(payload);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: payload });
    },
    closeBundle() {
      for (const dir of ["dist", "dist/client", "dist/public"]) {
        try {
          if (!fs.existsSync(dir)) continue;
          fs.writeFileSync(path.join(dir, "version.json"), payload);
        } catch {
          /* ignore */
        }
      }
    },
  };
}

/**
 * Nest-owned paths proxied in local dev.
 * Do NOT proxy all of `/api/*` yet — TanStack still serves a few public routes
 * under src/routes/api/**. Expand this list as Phase 2 migrates endpoints.
 *
 * Dual ownership note: `/api/public/notification-queue-worker` exists as both a
 * TanStack file route and a Nest controller. Vite proxy sends browser/dev hits
 * to Nest; the TanStack route forwards to Nest with CRON_SECRET when invoked
 * on the Start server. Prefer Nest as the drain owner going forward.
 */
const nestProxyPaths = [
  "/api/health",
  "/api/auth",
  "/api/accounts",
  "/api/files",
  "/api/chat",
  "/api/support",
  "/api/jobs",
  "/api/push",
  "/api/platform",
  "/api/pilot-cities",
  "/api/pricing",
  "/api/payments",
  "/api/munch",
  "/api/whatsapp",
  "/api/admin",
  "/api/admin-assistant",
  "/api/admin-chat",
  "/api/public/jobs",
  "/api/public/notification-queue-worker",
  "/api/public/whatsapp-maintenance",
  "/api/public/green-webhook",
  "/api/public/whatsapp-cloud-webhook",
  "/api/public/track",
  "/api/public/track-stop",
  "/api/public/intake",
  "/api/public/paypal-webhook",
  "/api/public/hooks/chat-push",
];

const proxy: Record<string, { target: string; changeOrigin: boolean }> = {};
for (const path of nestProxyPaths) {
  proxy[path] = { target: nestTarget, changeOrigin: true };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Pin Netlify when building on Netlify CI (or with NITRO_PRESET=netlify).
  // Outside Netlify, Lovable's default Cloudflare preset remains.
  nitro:
    process.env.NITRO_PRESET === "netlify" || process.env.NETLIFY === "true"
      ? { preset: "netlify" }
      : undefined,
  vite: {
    define: {
      "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(appBuildId),
    },
    plugins: [appVersionPlugin(appBuildId)],
    server: {
      proxy,
    },
  },
});
