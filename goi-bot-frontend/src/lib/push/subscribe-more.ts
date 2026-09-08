import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";
import { ensureBrowserSubscription, pushSupported } from "./subscribe";

type Reason = "unsupported" | "denied" | "subscribe-failed";
type Target = { kind: "business"; businessId: string } | { kind: "customer"; userId: string };

async function enablePush(path: string, id: string): Promise<{ ok: boolean; reason?: Reason }> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  const subscription = await ensureBrowserSubscription();
  if (!subscription) return { ok: false, reason: Notification.permission === "denied" ? "denied" : "subscribe-failed" };
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
