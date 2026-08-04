// Goi app-shell service worker cleanup.
// We keep the PWA install metadata, but remove app-shell caching because it can
// strand couriers on stale mobile code after every deployment.
function isGoiAppShellCache(name) {
  const isGoiCache = name.startsWith("goi-sw-");
  const isWorkboxCacheForThisScope = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name)
    && name.endsWith(self.registration.scope);
  return isGoiCache || isWorkboxCacheForThisScope;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.allSettled(
          cacheNames.filter(isGoiAppShellCache).map((name) => caches.delete(name)),
        );
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  );
});
