/**
 * Browser helpers for Nest domain endpoints.
 */
import { apiFetch } from "@/lib/api-client";
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

export function nestListAreas() { return apiFetch<Record<string, unknown>[]>("/api/platform/areas", options()); }
export function nestGetExpressPricing() { return apiFetch<Record<string, unknown>[]>("/api/pricing/express-active", options()); }
export function nestGetPricing() { return apiFetch<Record<string, unknown>>("/api/pricing/active", options()); }
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

export function nestListMyDeclinedOffers() {
  return apiFetch<Record<string, unknown>[]>("/api/accounts/couriers/me/declined-offers", options());
}

export function nestMyNotificationUnreadCount() {
  return apiFetch<number>("/api/accounts/couriers/me/notification-unread", options());
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

/** Tables not yet on Nest — reads return empty; writes throw. */
export function nestListSavedContacts(): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestUpsertSavedContact(_body: Record<string, unknown>) {
  throw new Error("TODO Nest: POST /api/accounts/customers/me/contacts");
}

export function nestDeleteSavedContact(_id: string) {
  throw new Error("TODO Nest: DELETE /api/accounts/customers/me/contacts/:id");
}

export function nestListTeamMembers(): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestInviteTeamMember(_body: Record<string, unknown>) {
  throw new Error("TODO Nest: POST /api/accounts/customers/me/team-members");
}

export function nestUpdateTeamMemberRole(_id: string, _role: string) {
  throw new Error("TODO Nest: PATCH /api/accounts/customers/me/team-members/:id");
}

export function nestDeleteTeamMember(_id: string) {
  throw new Error("TODO Nest: DELETE /api/accounts/customers/me/team-members/:id");
}

export function nestListRecurringOrders(): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestSaveRecurringOrder(_body: Record<string, unknown>, _id?: string) {
  throw new Error("TODO Nest: POST/PATCH /api/accounts/customers/me/recurring-orders");
}

export function nestDeleteRecurringOrder(_id: string) {
  throw new Error("TODO Nest: DELETE /api/accounts/customers/me/recurring-orders/:id");
}

export function nestListWalletTransactions(): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestRechargeWallet(_body: Record<string, unknown>) {
  throw new Error("TODO Nest: POST /api/payments/wallet/recharge");
}

export function nestToggleRecurringOrderActive(_id: string, _active: boolean) {
  throw new Error("TODO Nest: PATCH /api/accounts/customers/me/recurring-orders/:id");
}

/** Admin / missing endpoints — reads empty; writes throw. */
export function nestListCourierTags(_courierId: string): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestListAllTags(): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestAddCourierTag(_courierId: string, _tagId: string) {
  throw new Error("TODO Nest: POST /api/accounts/couriers/:id/tags");
}

export function nestRemoveCourierTag(_courierId: string, _tagId: string) {
  throw new Error("TODO Nest: DELETE /api/accounts/couriers/:id/tags/:tagId");
}

export function nestListCourierWhatsappMessages(_courierId: string): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}

export function nestListCourierEntityStatusLogs(_courierId: string): Promise<Record<string, unknown>[]> {
  return Promise.resolve([]);
}
