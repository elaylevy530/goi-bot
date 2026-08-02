import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

export const VAPID_PUBLIC_KEY = "BF3eamyR2GHy-C6-gUAquee6YKpTj_0E2r3lmhuaYh-mLKOHG0pVdVCDRrLYyYLyumy7Z3boGdrDWnqTiUQ7T-g";

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

async function ensureBrowserSubscription() {
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

export async function enablePushForCourier(courierId: string) {
  if (!pushSupported()) return { ok: false, reason: "unsupported" as const };
  const subscription = await ensureBrowserSubscription();
  if (!subscription) return { ok: false, reason: "denied" as const };
  await apiFetch("/api/push/courier-subscriptions", {
    method: "POST",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ courierId, subscription: subscription.toJSON() }),
  });
  return { ok: true };
}

export async function disablePushForCourier(courierId: string) {
  await apiFetch(`/api/push/courier-subscriptions/${courierId}`, {
    method: "DELETE",
    accessToken: getNestAccessToken(),
  });
}

export async function pushSubscriptionStatus() {
  return pushSupported()
    ? (Notification.permission as "granted" | "denied" | "default")
    : "unsupported" as const;
}

export async function ensurePushSubscriptionFresh(courierId: string) {
  if (Notification.permission === "granted") await enablePushForCourier(courierId);
}
