/**
 * Thin Nest accounts API helpers for browser/client code.
 */

import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken, type NestCourierProfile, type NestCustomerProfile } from "@/lib/nest-auth";

export type NestBusinessNotification = {
  id: string;
  business_id: string;
  job_id?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
};

export type NestDashboardStats = {
  stats: {
    total_couriers: number;
    registered_today: number;
    active_couriers: number;
    pending_approval: number;
    total_customers: number;
    open_jobs: number;
    jobs_sent_today: number;
    courier_replies_today: number;
  };
  attention: Array<{ label: string; count: number; to: string }>;
};

function token() {
  return getNestAccessToken();
}

export function nestListCouriers(params?: { status?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<NestCourierProfile[]>(`/api/accounts/couriers${q ? `?${q}` : ""}`, {
    accessToken: token(),
  });
}

export function nestCreateCourier(body: Record<string, unknown>) {
  return apiFetch<NestCourierProfile>("/api/accounts/couriers", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestGetCourier(id: string) {
  return apiFetch<NestCourierProfile>(`/api/accounts/couriers/${id}`, { accessToken: token() });
}

export function nestUpdateCourier(id: string, body: Record<string, unknown>) {
  return apiFetch<NestCourierProfile>(`/api/accounts/couriers/${id}`, {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestApproveCourier(id: string, body: Record<string, unknown> = {}) {
  return apiFetch<NestCourierProfile>(`/api/accounts/couriers/${id}/approve`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestDeleteCourier(id: string) {
  return apiFetch<{ ok: true }>(`/api/accounts/couriers/${id}`, {
    method: "DELETE",
    accessToken: token(),
  });
}

export function nestUpdateMyCourier(body: Record<string, unknown>) {
  return apiFetch<NestCourierProfile>("/api/accounts/couriers/me", {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export type NestCourierDocument = {
  id?: string | null;
  courier_id: string;
  type: string;
  file_url: string | null;
  expires_at: string | Date | null;
  verified?: boolean;
};

export function nestListMyCourierDocuments() {
  return apiFetch<NestCourierDocument[]>("/api/accounts/couriers/me/documents", {
    accessToken: token(),
  });
}

export function nestUpdateMyCourierDocument(
  type: string,
  body: { file_url?: string | null; expires_at?: string | null },
) {
  return apiFetch<NestCourierDocument>(
    `/api/accounts/couriers/me/documents/${encodeURIComponent(type)}`,
    {
      method: "PATCH",
      accessToken: token(),
      body: JSON.stringify(body),
    },
  );
}

export function nestCloseMyCourier() {
  return apiFetch<{ ok: true }>("/api/accounts/couriers/me/close", {
    method: "POST",
    accessToken: token(),
  });
}

export function nestListCustomers(params?: { status?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<NestCustomerProfile[]>(`/api/accounts/customers${q ? `?${q}` : ""}`, {
    accessToken: token(),
  });
}

export function nestGetCustomer(id: string) {
  return apiFetch<NestCustomerProfile>(`/api/accounts/customers/${id}`, { accessToken: token() });
}

export function nestCreateCustomer(body: Record<string, unknown>) {
  return apiFetch<NestCustomerProfile>("/api/accounts/customers", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestUpdateCustomer(id: string, body: Record<string, unknown>) {
  return apiFetch<NestCustomerProfile>(`/api/accounts/customers/${id}`, {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestUpdateMyCustomer(body: Record<string, unknown>) {
  return apiFetch<NestCustomerProfile>("/api/accounts/customers/me", {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestAdminDashboardStats() {
  return apiFetch<NestDashboardStats>("/api/accounts/admin/dashboard-stats", {
    accessToken: token(),
  });
}

export function nestListMyNotifications(limit = 8) {
  return apiFetch<NestBusinessNotification[]>(
    `/api/accounts/customers/me/notifications?limit=${limit}`,
    { accessToken: token() },
  );
}

export function nestUnreadNotificationCount() {
  return apiFetch<number>("/api/accounts/customers/me/notifications/unread-count", {
    accessToken: token(),
  });
}

export function nestMarkAllNotificationsRead() {
  return apiFetch<{ ok: true }>("/api/accounts/customers/me/notifications/read-all", {
    method: "PATCH",
    accessToken: token(),
  });
}

export function nestMarkNotificationRead(id: string) {
  return apiFetch<{ ok: true }>(`/api/accounts/customers/me/notifications/${id}/read`, {
    method: "PATCH",
    accessToken: token(),
  });
}
