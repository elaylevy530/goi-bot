import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

/** Fallback used only if the API has not published a public key yet. */
export const VAPID_PUBLIC_KEY = "BFE2xeIAbYe6XrxUG2mffd3IUBS1rcc7NWnUrJUrEkI58dKGR4TLwfKEMaw5fe_yNM0ACe2eFQccqrVqQYI63WA";

let cachedVapidPublicKey: string | null = null;

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function asBytes(key: BufferSource): Uint8Array {
  if (key instanceof Uint8Array) return key;
  if (key instanceof ArrayBuffer) return new Uint8Array(key);
  return new Uint8Array(key.buffer, key.byteOffset, key.byteLength);
}

function sameApplicationServerKey(a: BufferSource | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const left = asBytes(a);
  if (left.length === b.length) {
    return left.every((v, i) => v === b[i]);
  }
  // Some browsers prefix the uncompressed point with 0x00.
  if (left.length === b.length + 1 && left[0] === 0) {
    return left.slice(1).every((v, i) => v === b[i]);
  }
  if (b.length === left.length + 1 && b[0] === 0) {
    return b.slice(1).every((v, i) => v === left[i]);
  }
  return false;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function resolveVapidPublicKey(): Promise<string> {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;
  const fromEnv = String(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "").trim();
  if (fromEnv) {
    cachedVapidPublicKey = fromEnv;
    return fromEnv;
  }
  try {
    const data = await apiFetch<{ publicKey: string | null }>("/api/push/vapid-public");
    if (data.publicKey) {
      cachedVapidPublicKey = data.publicKey;
      return data.publicKey;
    }
  } catch {
    /* fall through to bundled key */
  }
  cachedVapidPublicKey = VAPID_PUBLIC_KEY;
  return VAPID_PUBLIC_KEY;
}

export async function ensureBrowserSubscription() {
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  const applicationServerKey = urlBase64ToUint8Array(await resolveVapidPublicKey());
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const currentKey = existing.options?.applicationServerKey;
    if (!currentKey || sameApplicationServerKey(currentKey, applicationServerKey)) {
      return existing;
    }
    await existing.unsubscribe().catch(() => undefined);
  }
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return null;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
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
