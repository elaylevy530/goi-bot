/**
 * Browser helpers for Nest domain endpoints.
 */
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

const options = () => ({ accessToken: getNestAccessToken() });

export function nestListAdminNotifications() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/courier-admin-notifications", options());
}
export function nestCreateAdminNotification(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/courier-admin-notifications", { method: "POST", ...options(), body: JSON.stringify(body) });
}
export function nestDeleteAdminNotification(id: string) {
  return apiFetch(`/api/accounts/courier-admin-notifications/${id}`, { method: "DELETE", ...options() });
}

export function nestListBonuses() { return apiFetch<Record<string, unknown>[]>("/api/accounts/bonuses", options()); }
export function nestListActiveBonuses() { return apiFetch<Record<string, unknown>[]>("/api/accounts/bonuses/active", options()); }
export function nestCreateBonus(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/bonuses", { method: "POST", ...options(), body: JSON.stringify(body) });
}
export function nestUpdateBonus(id: string, body: Record<string, unknown>) {
  return apiFetch(`/api/accounts/bonuses/${id}`, { method: "PATCH", ...options(), body: JSON.stringify(body) });
}
export function nestDeleteBonus(id: string) {
  return apiFetch(`/api/accounts/bonuses/${id}`, { method: "DELETE", ...options() });
}

export function nestListWithdrawals() { return apiFetch<Record<string, unknown>[]>("/api/accounts/withdrawals", options()); }
export function nestCreateWithdrawal(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/withdrawals", { method: "POST", ...options(), body: JSON.stringify(body) });
}
export function nestUpdateWithdrawal(id: string, body: Record<string, unknown>) {
  return apiFetch(`/api/accounts/withdrawals/${id}`, {
    method: "PATCH",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestListAreas() { return apiFetch<Record<string, unknown>[]>("/api/platform/areas", options()); }
export function nestCreateArea(name: string) {
  return apiFetch("/api/platform/areas", { method: "POST", ...options(), body: JSON.stringify({ name }) });
}
export function nestDeleteArea(id: string) {
  return apiFetch(`/api/platform/areas/${id}`, { method: "DELETE", ...options() });
}

export function nestListTags() {
  return apiFetch<Record<string, unknown>[]>("/api/platform/tags", options());
}
export function nestCreateTag(name: string) {
  return apiFetch("/api/platform/tags", { method: "POST", ...options(), body: JSON.stringify({ name }) });
}
export function nestDeleteTag(id: string) {
  return apiFetch(`/api/platform/tags/${id}`, { method: "DELETE", ...options() });
}

export function nestListClassificationRules() {
  return apiFetch<Record<string, unknown>[]>("/api/platform/classification-rules", options());
}
export function nestUpdateClassificationRule(id: string, body: Record<string, unknown>) {
  return apiFetch(`/api/platform/classification-rules/${id}`, {
    method: "PATCH",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestGetExpressPricing() { return apiFetch<Record<string, unknown>[]>("/api/pricing/express-active", options()); }
export function nestUpdateExpressPricingRule(id: string, body: Record<string, unknown>) {
  return apiFetch(`/api/pricing/express/${id}`, {
    method: "PATCH",
    ...options(),
    body: JSON.stringify(body),
  });
}
export function nestGetPricing() { return apiFetch<Record<string, unknown>>("/api/pricing/active", options()); }

export type NestPriceBreakdown = {
  pricing_version: number;
  pricing_rule_id: string;
  base_price: number;
  distance_km: number;
  distance_price: number;
  surcharges: number;
  subtotal: number;
  business_total: number;
  platform_fee: number;
  courier_payout: number;
  computed_at: string;
};

export async function nestComputePrice(input: {
  distanceKm: number;
  extraStops?: number;
  isHeavy?: boolean;
}): Promise<NestPriceBreakdown | null> {
  try {
    return await apiFetch<NestPriceBreakdown>("/api/pricing/compute", {
      method: "POST",
      ...options(),
      body: JSON.stringify({
        distanceKm: input.distanceKm,
        extraStops: input.extraStops ?? 0,
        isHeavy: input.isHeavy ?? false,
      }),
    });
  } catch (e) {
    if (e instanceof ApiClientError && e.status === 404) return null;
    throw e;
  }
}
export function nestUpdatePricing(body: Record<string, unknown>) {
  return apiFetch("/api/pricing/active", { method: "POST", ...options(), body: JSON.stringify(body) });
}

export function nestGetJobOutcome(jobId: string) { return apiFetch<Record<string, unknown>>(`/api/jobs/${jobId}/outcome`, options()); }
export function nestPutJobOutcome(jobId: string, body: Record<string, unknown>) {
  return apiFetch(`/api/jobs/${jobId}/outcome`, { method: "PUT", ...options(), body: JSON.stringify(body) });
}
export function nestListJobStatusLogs(jobId: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/jobs/${jobId}/status-logs`, options());
}

export function nestGetMyCourierStats() {
  return apiFetch<Record<string, unknown> | null>("/api/accounts/couriers/me/stats", options());
}

export function nestGetCourierStats(courierId: string) {
  return apiFetch<Record<string, unknown> | null>(`/api/accounts/couriers/${courierId}/stats`, options());
}

export function nestListMyCourierOutcomes() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/couriers/me/outcomes", options());
}

export function nestListMyCourierReferrals() {
  return apiFetch<{
    couriers?: Record<string, unknown>[];
    businesses?: Record<string, unknown>[];
    commissions?: {
      id?: string;
      job_id?: string;
      kind?: "courier" | "business";
      amount?: number;
      created_at?: string;
    }[];
    commission_ils?: number;
    totals?: Record<string, number>;
  }>("/api/accounts/couriers/me/referrals", options());
}

export function nestListMyDeclinedOffers() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/couriers/me/declined-offers", options());
}

export function nestMyNotificationUnreadCount() {
  return apiFetch<number>("/api/accounts/couriers/me/notification-unread", options());
}

export function nestListMyCourierNotifications() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/couriers/me/notifications", options());
}

export function nestMarkCourierNotificationRead(id: string) {
  return apiFetch<{ ok: true }>(`/api/accounts/couriers/me/notifications/${id}/read`, {
    method: "PATCH",
    ...options(),
  });
}

export function nestListMyBranches() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/branches", options());
}

export function nestCreateBranch(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/customers/me/branches", { method: "POST", ...options(), body: JSON.stringify(body) });
}

export function nestUpdateBranch(id: string, body: Record<string, unknown>) {
  return apiFetch(`/api/accounts/customers/me/branches/${id}`, { method: "PATCH", ...options(), body: JSON.stringify(body) });
}

export function nestDeleteBranch(id: string) {
  return apiFetch(`/api/accounts/customers/me/branches/${id}`, { method: "DELETE", ...options() });
}

export function nestSetDefaultBranch(id: string) {
  return apiFetch(`/api/accounts/customers/me/branches/${id}/default`, { method: "POST", ...options() });
}

export function nestGetMyIntegration() {
  return apiFetch<Record<string, unknown>>("/api/accounts/customers/me/integration", options());
}

export function nestUpdateMyIntegration(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/customers/me/integration", { method: "PATCH", ...options(), body: JSON.stringify(body) });
}

export function nestListMyIntegrationLogs() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/integration/logs", options());
}

export function nestListMyBillingRecords() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/billing-records", options());
}

export function nestListMySupportTickets() {
  return apiFetch<Record<string, unknown>[]>("/api/support/tickets", options());
}

export function nestCreateSupportTicket(body: Record<string, unknown>) {
  return apiFetch("/api/support/tickets", { method: "POST", ...options(), body: JSON.stringify(body) });
}

export type NestFavoriteCourier = {
  id: string;
  courier_id: string;
  status: string;
  couriers: {
    full_name?: string | null;
    whatsapp_phone?: string | null;
    vehicle_label?: string | null;
    vehicle_type?: string | null;
    base_city?: string | null;
    avatar_url?: string | null;
  } | null;
};

export function nestListMyFavorites() {
  return apiFetch<NestFavoriteCourier[]>("/api/accounts/customers/me/favorites", options());
}

export function nestGetFavoriteCourier(courierId: string) {
  return apiFetch<Record<string, unknown> | null>(`/api/accounts/customers/me/favorites/${courierId}`, options());
}

export function nestSetFavoriteCourier(courierId: string, status: string | null) {
  return apiFetch(`/api/accounts/customers/me/favorites/${courierId}`, {
    method: "PUT",
    ...options(),
    body: JSON.stringify({ status }),
  });
}

export function nestListCustomerJobs(customerId: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/accounts/customers/${customerId}/jobs`, options());
}

export function nestListSavedContacts() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/contacts", options());
}

export function nestUpsertSavedContact(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/customers/me/contacts", {
    method: "POST",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestDeleteSavedContact(id: string) {
  return apiFetch(`/api/accounts/customers/me/contacts/${id}`, { method: "DELETE", ...options() });
}

export function nestListTeamMembers() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/team-members", options());
}

export function nestInviteTeamMember(body: Record<string, unknown>) {
  return apiFetch("/api/accounts/customers/me/team-members", {
    method: "POST",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestUpdateTeamMemberRole(id: string, role: string) {
  return apiFetch(`/api/accounts/customers/me/team-members/${id}`, {
    method: "PATCH",
    ...options(),
    body: JSON.stringify({ role }),
  });
}

export function nestDeleteTeamMember(id: string) {
  return apiFetch(`/api/accounts/customers/me/team-members/${id}`, { method: "DELETE", ...options() });
}

export function nestListRecurringOrders() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/customers/me/recurring-orders", options());
}

export function nestSaveRecurringOrder(body: Record<string, unknown>, id?: string) {
  if (id) {
    return apiFetch(`/api/accounts/customers/me/recurring-orders/${id}`, {
      method: "PATCH",
      ...options(),
      body: JSON.stringify(body),
    });
  }
  return apiFetch("/api/accounts/customers/me/recurring-orders", {
    method: "POST",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestDeleteRecurringOrder(id: string) {
  return apiFetch(`/api/accounts/customers/me/recurring-orders/${id}`, { method: "DELETE", ...options() });
}

export function nestToggleRecurringOrderActive(id: string, active: boolean) {
  return apiFetch(`/api/accounts/customers/me/recurring-orders/${id}`, {
    method: "PATCH",
    ...options(),
    body: JSON.stringify({ active }),
  });
}

export function nestListWalletTransactions() {
  return apiFetch<Record<string, unknown>[]>("/api/payments/wallet/transactions", options());
}

export function nestRechargeWallet(body: Record<string, unknown>) {
  return apiFetch("/api/payments/wallet/recharge", {
    method: "POST",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestListCourierTags(courierId: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/accounts/couriers/${courierId}/tags`, options());
}

export function nestListAllTags() {
  return nestListTags();
}

export function nestAddCourierTag(courierId: string, tagId: string) {
  return apiFetch(`/api/accounts/couriers/${courierId}/tags`, {
    method: "POST",
    ...options(),
    body: JSON.stringify({ tag_id: tagId }),
  });
}

export function nestRemoveCourierTag(courierId: string, tagId: string) {
  return apiFetch(`/api/accounts/couriers/${courierId}/tags/${tagId}`, {
    method: "DELETE",
    ...options(),
  });
}

export function nestSendWhatsapp(body: {
  phone: string;
  message: string;
  courier_id?: string;
  job_id?: string;
  log_only?: boolean;
}) {
  return apiFetch("/api/whatsapp/send", {
    method: "POST",
    ...options(),
    body: JSON.stringify(body),
  });
}

export function nestListCourierWhatsappMessages(_courierId: string): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestListCourierEntityStatusLogs(_courierId: string): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}
