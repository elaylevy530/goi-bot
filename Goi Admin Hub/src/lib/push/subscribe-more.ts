// Push subscribe helpers for business and customer roles.
// Mirrors the courier helpers in ./subscribe.ts but writes to
// business_push_subscriptions / customer_push_subscriptions tables.

import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, pushSupported } from "./subscribe";

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
  if (window.top !== window.self) return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

type Reason = "unsupported" | "denied" | "preview" | "sw-failed" | "subscribe-failed" | "db-failed";

type Target =
  | { kind: "business"; businessId: string }
  | { kind: "customer"; userId: string };

async function subscribeCurrentDevice(): Promise<
  { ok: true; endpoint: string; p256dh: string; auth: string } | { ok: false; reason: Reason }
> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (isPreviewEnv()) return { ok: false, reason: "preview" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch {
    return { ok: false, reason: "sw-failed" };
  }
  let sub: PushSubscription | null;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer.slice(
          appServerKey.byteOffset,
          appServerKey.byteOffset + appServerKey.byteLength,
        ) as ArrayBuffer,
      });
    }
  } catch {
    return { ok: false, reason: "subscribe-failed" };
  }
  const json: any = sub.toJSON();
  const p256dh = json?.keys?.p256dh || bufToB64(sub.getKey("p256dh"));
  const auth = json?.keys?.auth || bufToB64(sub.getKey("auth"));
  return { ok: true, endpoint: sub.endpoint, p256dh, auth };
}

export async function enablePushForBusiness(businessId: string): Promise<{ ok: boolean; reason?: Reason }> {
  const s = await subscribeCurrentDevice();
  if (!s.ok) return s;
  const { error } = await supabase
    .from("business_push_subscriptions")
    .upsert(
      {
        business_id: businessId,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
        user_agent: navigator.userAgent.slice(0, 200),
      } as never,
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, reason: "db-failed" };
  return { ok: true };
}

export async function enablePushForCustomer(userId: string): Promise<{ ok: boolean; reason?: Reason }> {
  const s = await subscribeCurrentDevice();
  if (!s.ok) return s;
  const { error } = await supabase
    .from("customer_push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
        user_agent: navigator.userAgent.slice(0, 200),
      } as never,
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, reason: "db-failed" };
  return { ok: true };
}

export async function enablePushFor(target: Target): Promise<{ ok: boolean; reason?: Reason }> {
  return target.kind === "business"
    ? enablePushForBusiness(target.businessId)
    : enablePushForCustomer(target.userId);
}
