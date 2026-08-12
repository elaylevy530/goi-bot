/**
 * Thin Nest jobs API helpers for browser/client code.
 */

import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

export type NestJob = Record<string, unknown> & {
  id: string;
  job_number: string;
  status: string;
  job_type?: string;
  pricing_type?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  selected_courier_id?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  payment?: string;
  created_at?: string;
};

export type NestOfferEvent = Record<string, unknown> & {
  id: string;
  job_id: string;
  courier_id: string;
  response: string;
  sent_at: string;
  expires_at?: string | null;
  jobs?: NestJob | null;
};

export type NestJobDecline = {
  id: string;
  courier_id: string;
  job_id: string;
  declined_at: string;
};

function token() {
  return getNestAccessToken();
}

export function nestListJobs(params?: { status?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return apiFetch<NestJob[]>(`/api/jobs${q ? `?${q}` : ""}`, { accessToken: token() });
}

export function nestGetJob(id: string) {
  return apiFetch<NestJob>(`/api/jobs/${id}`, { accessToken: token() });
}

export function nestCreateJob(body: Record<string, unknown>) {
  return apiFetch<NestJob>("/api/jobs", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestUpdateJob(id: string, body: Record<string, unknown>) {
  return apiFetch<NestJob>(`/api/jobs/${id}`, {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestCancelJob(id: string, reason?: string) {
  return apiFetch<NestJob>(`/api/jobs/${id}/cancel`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  });
}

export function nestGetJobByToken(tokenValue: string) {
  return apiFetch<Record<string, unknown>>(`/api/jobs/by-token/${encodeURIComponent(tokenValue)}`);
}

export function nestListJobQuotes(jobId: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/jobs/${jobId}/quotes`, { accessToken: token() });
}

export function nestSubmitJobQuote(jobId: string, body: Record<string, unknown>) {
  return apiFetch<Record<string, unknown>>(`/api/jobs/${jobId}/quotes`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestSelectJobQuote(jobId: string, quoteId: string) {
  return apiFetch<{ job: NestJob; quote: Record<string, unknown> }>(
    `/api/jobs/${jobId}/quotes/${quoteId}/select`,
    { method: "POST", accessToken: token() },
  );
}

export function nestListCourierOffers(response?: string) {
  const q = response ? `?response=${encodeURIComponent(response)}` : "";
  return apiFetch<NestOfferEvent[]>(`/api/jobs/courier/offers${q}`, { accessToken: token() });
}

export function nestListCourierDeclines() {
  return apiFetch<NestJobDecline[]>("/api/jobs/courier/declines", { accessToken: token() });
}

export function nestAddCourierDecline(jobId: string) {
  return apiFetch<NestJobDecline>("/api/jobs/courier/declines", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify({ job_id: jobId }),
  });
}

export function nestRemoveCourierDecline(jobId: string) {
  return apiFetch<{ ok: true }>(`/api/jobs/courier/declines/${jobId}`, {
    method: "DELETE",
    accessToken: token(),
  });
}

export function nestListOpenBroadcastJobs() {
  return apiFetch<NestJob[]>("/api/jobs/courier/open-broadcast", { accessToken: token() });
}

export function nestListOpenQuoteJobs() {
  return apiFetch<NestJob[]>("/api/jobs/courier/open-quotes", { accessToken: token() });
}

export function nestCourierActiveJobCount() {
  return apiFetch<number>("/api/jobs/courier/active-count", { accessToken: token() });
}

export function nestListCourierQuotes(jobIds: string[]) {
  const q = jobIds.length ? `?job_ids=${encodeURIComponent(jobIds.join(","))}` : "";
  return apiFetch<Record<string, unknown>[]>(`/api/jobs/courier/quotes${q}`, {
    accessToken: token(),
  });
}

export function nestRespondOffer(offerId: string, response: "accepted" | "declined") {
  return apiFetch<{ ok: boolean; reason?: string; job_id?: string }>(
    "/api/jobs/courier/respond-offer",
    {
      method: "POST",
      accessToken: token(),
      body: JSON.stringify({ offer_id: offerId, response }),
    },
  );
}

export function nestClaimJob(jobId: string, source = "new-jobs") {
  return apiFetch<{ ok: boolean; reason?: string; job_id?: string }>(
    "/api/jobs/courier/claim",
    {
      method: "POST",
      accessToken: token(),
      body: JSON.stringify({ job_id: jobId, source }),
    },
  );
}

export type NestJobOutcome = {
  id?: string;
  job_id: string;
  courier_id?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  expected_delivery_at?: string | null;
  late_minutes?: number | null;
  was_late?: boolean | null;
  was_cancelled?: boolean | null;
  cancellation_reason?: string | null;
  customer_rating?: number | null;
  customer_comment?: string | null;
  tip_amount?: number | null;
  internal_notes?: string | null;
};

export type NestStatusLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  old_status?: string | null;
  new_status: string;
  note?: string | null;
  created_at: string;
};

export function nestGetJobOutcome(jobId: string) {
  return apiFetch<NestJobOutcome | null>(`/api/jobs/${jobId}/outcome`, { accessToken: token() });
}

export function nestPutJobOutcome(jobId: string, body: Record<string, unknown>) {
  return apiFetch<NestJobOutcome>(`/api/jobs/${jobId}/outcome`, {
    method: "PUT",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestListJobStatusLogs(jobId: string) {
  return apiFetch<NestStatusLog[]>(`/api/jobs/${jobId}/status-logs`, { accessToken: token() });
}

export function nestListCourierActiveJobs() {
  return apiFetch<NestJob[]>("/api/jobs/courier/active-jobs", { accessToken: token() });
}

export function nestCourierUpdateProgress(jobId: string, step: string) {
  return apiFetch<{ ok: true }>("/api/jobs/courier/progress", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify({ job_id: jobId, step }),
  });
}

export function nestListJobStops(jobId: string) {
  return apiFetch<Record<string, unknown>[]>(`/api/jobs/${jobId}/stops`, { accessToken: token() });
}

export function nestUpdateJobStop(jobId: string, stopId: string, status: "arrived" | "done") {
  return apiFetch<Record<string, unknown>>(`/api/jobs/${jobId}/stops/${stopId}`, {
    method: "PATCH",
    accessToken: token(),
    body: JSON.stringify({ status }),
  });
}

export function nestGetJobEnriched(id: string) {
  return nestGetJob(id);
}
