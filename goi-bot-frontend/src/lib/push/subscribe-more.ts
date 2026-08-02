import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";
import { pushSupported, urlBase64ToUint8Array, VAPID_PUBLIC_KEY } from "./subscribe";

type Reason = "unsupported" | "denied" | "subscribe-failed";
type Target = { kind: "business"; businessId: string } | { kind: "customer"; userId: string };

async function enablePush(path: string, id: string): Promise<{ ok: boolean; reason?: Reason }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    if (Notification.permission === "denied") return { ok: false, reason: "denied" };
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  if (!subscription) return { ok: false, reason: "subscribe-failed" };
  await apiFetch(path, {
    method: "POST",
    accessToken: getNestAccessToken(),
    body: JSON.stringify({ id, subscription: subscription.toJSON() }),
  });
  return { ok: true };
}

export const enablePushForBusiness = (businessId: string) =>
  enablePush("/api/push/business-subscriptions", businessId);

export const enablePushForCustomer = (userId: string) =>
  enablePush("/api/push/customer-subscriptions", userId);

export const enablePushFor = (target: Target) =>
  target.kind === "business"
    ? enablePushForBusiness(target.businessId)
    : enablePushForCustomer(target.userId);
