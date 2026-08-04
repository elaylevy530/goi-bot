// Client-side Web Push subscribe / unsubscribe.
// Registers a dedicated /push-sw.js (separate from the kill-switch /sw.js).
// Guards against Lovable preview / dev / iframe environments.

import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BF3eamyR2GHy-C6-gUAquee6YKpTj_0E2r3lmhuaYh-mLKOHG0pVdVCDRrLYyYLyumy7Z3boGdrDWnqTiUQ7T-g";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function isPreviewEnv(): boolean {
  if (typeof window === "undefined") return true;
  if (window.top !== window.self) return true; // iframe
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

export function pushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn("[push] sw register failed", e);
    return null;
  }
}

/**
 * Subscribe the current device to push and save the endpoint+keys to the DB.
 * Safe to call repeatedly — uses unique endpoint upsert.
 * Skips in preview/iframe environments where SWs are forbidden.
 */
export async function enablePushForCourier(courierId: string): Promise<{
  ok: boolean;
  reason?: "unsupported" | "denied" | "preview" | "sw-failed" | "subscribe-failed" | "db-failed";
}> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (isPreviewEnv()) return { ok: false, reason: "preview" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await getOrRegisterSW();
  if (!reg) return { ok: false, reason: "sw-failed" };

  let sub: PushSubscription | null = null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer.slice(appServerKey.byteOffset, appServerKey.byteOffset + appServerKey.byteLength) as ArrayBuffer,
      });
    }
  } catch (e) {
    console.warn("[push] subscribe failed", e);
    return { ok: false, reason: "subscribe-failed" };
  }

  const json: any = sub.toJSON();
  const p256dh = json?.keys?.p256dh || bufToB64(sub.getKey("p256dh"));
  const auth = json?.keys?.auth || bufToB64(sub.getKey("auth"));

  const { error } = await supabase
    .from("courier_push_subscriptions")
    .upsert(
      {
        courier_id: courierId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 200),
      } as never,
      { onConflict: "endpoint" },
    );
  if (error) {
    console.warn("[push] db upsert failed", error.message);
    return { ok: false, reason: "db-failed" };
  }
  return { ok: true };
}

export async function disablePushForCourier(courierId: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("courier_push_subscriptions").delete().eq("courier_id", courierId).eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch (e) {
    console.warn("[push] disable failed", e);
  }
}

export async function pushSubscriptionStatus(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as "granted" | "denied" | "default";
}

/**
 * Silently re-subscribe the device if its current push subscription was
 * created with a different VAPID key than the one we now use. Runs without
 * any user prompt when Notification permission is already "granted".
 * Safe to call on every mount — no-op when the key already matches.
 */
export async function ensurePushSubscriptionFresh(courierId: string): Promise<void> {
  if (!pushSupported() || isPreviewEnv()) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await getOrRegisterSW();
    if (!reg) return;

    const current = await reg.pushManager.getSubscription();
    const expectedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    if (current) {
      const currentKeyBuf = current.options.applicationServerKey;
      const currentKey = currentKeyBuf ? new Uint8Array(currentKeyBuf as ArrayBuffer) : null;
      const matches =
        currentKey &&
        currentKey.length === expectedKey.length &&
        currentKey.every((b, i) => b === expectedKey[i]);
      if (matches) return; // already on the new key

      // Remove stale subscription (both remotely and locally)
      try {
        await supabase.from("courier_push_subscriptions").delete().eq("endpoint", current.endpoint);
      } catch {}
      try {
        await current.unsubscribe();
      } catch {}
    }

    // Re-subscribe with the new VAPID key (no permission prompt — already granted)
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: expectedKey.buffer.slice(
        expectedKey.byteOffset,
        expectedKey.byteOffset + expectedKey.byteLength,
      ) as ArrayBuffer,
    });

    const json: any = sub.toJSON();
    const p256dh = json?.keys?.p256dh || bufToB64(sub.getKey("p256dh"));
    const auth = json?.keys?.auth || bufToB64(sub.getKey("auth"));

    await supabase
      .from("courier_push_subscriptions")
      .upsert(
        {
          courier_id: courierId,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 200),
        } as never,
        { onConflict: "endpoint" },
      );
  } catch (e) {
    console.warn("[push] auto-refresh failed", e);
  }
}
