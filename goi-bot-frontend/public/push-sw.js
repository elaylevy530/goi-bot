// Push notification service worker for Goi couriers.
// Separate from /sw.js (which is the kill-switch app-shell cleanup worker).
// Handles `push` events even when the PWA / browser tab is closed.

const TITLE = "Goi — משלוח חדש 🚚";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = { title: TITLE, body: "משלוח חדש זמין — הקש לצפייה", url: "/courier/new-jobs", tag: "goi-offer" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    // dataless push — keep defaults
  }
  // Android Chrome shows a heads-up banner only when each notification has a
  // UNIQUE tag (or renotify + unique tag) and is NOT marked requireInteraction
  // (which downgrades it to an "ongoing" notification that lives silently in
  // the shade). We keep vibrate + silent:false so it pings the screen like a
  // regular WhatsApp-style alert.
  const uniqueTag = `${payload.tag || "goi-offer"}-${Date.now()}`;
  event.waitUntil(
    (async () => {
      const url = payload.url || "/courier/new-jobs";
      const visibleClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.allSettled(
        visibleClients.map((client) => client.postMessage({ type: "goi-new-job-push", payload: { ...payload, url } })),
      );
      await self.registration.showNotification(payload.title || TITLE, {
        body: payload.body,
        tag: uniqueTag,
        renotify: true,
        silent: false,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [300, 100, 300, 100, 300],
        timestamp: Date.now(),
        data: { url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/courier/new-jobs";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        const url = new URL(c.url);
        if (url.pathname.startsWith("/courier")) {
          await c.focus();
          c.postMessage({ type: "goi-open", url: target });
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
