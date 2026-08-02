/**
 * Thin Nest chat API helpers for browser/client code.
 */

import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";
import { nestGetCourier, nestGetCustomer } from "@/lib/nest-accounts";
import { nestGetJob } from "@/lib/nest-jobs";

export type NestConversation = {
  id: string;
  kind: "courier_support" | "business_support" | "courier_business";
  courier_id: string | null;
  business_id: string | null;
  job_id: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_courier: number;
  unread_business: number;
  unread_admin: number;
  created_at?: string;
  updated_at?: string;
};

export type NestChatMessage = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_role: "courier" | "business" | "admin";
  body: string | null;
  attachment_url: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  attachment_size: number | string | null;
  attachment_kind: "image" | "audio" | "video" | "file" | null;
  duration_ms: number | null;
  created_at: string;
};

export type EnrichedConversation = NestConversation & {
  courier?: { full_name: string | null } | null;
  business?: { name: string | null } | null;
  job?: { id: string; pickup_address?: string | null; dropoff_address?: string | null } | null;
};

function token() {
  return getNestAccessToken();
}

export function nestListConversations() {
  return apiFetch<NestConversation[]>("/api/chat/conversations", { accessToken: token() });
}

export function nestOpenConversation(body: {
  kind?: string;
  courier_id?: string | null;
  business_id?: string | null;
  job_id?: string | null;
  subject?: string;
}) {
  return apiFetch<NestConversation>("/api/chat/conversations", {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestListMessages(conversationId: string) {
  return apiFetch<NestChatMessage[]>(`/api/chat/conversations/${conversationId}/messages`, {
    accessToken: token(),
  });
}

export function nestPostMessage(
  conversationId: string,
  body: {
    body?: string | null;
    attachment_url?: string | null;
    attachment_kind?: string | null;
    attachment_name?: string | null;
    attachment_mime?: string | null;
    attachment_size?: number | null;
    duration_ms?: number | null;
  },
) {
  return apiFetch<NestChatMessage>(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    accessToken: token(),
    body: JSON.stringify(body),
  });
}

export function nestMarkConversationRead(conversationId: string) {
  return apiFetch<{ ok: true }>(`/api/chat/conversations/${conversationId}/mark-read`, {
    method: "POST",
    accessToken: token(),
  });
}

/** Nest list endpoint returns flat rows — hydrate courier/business/job for UI titles. */
export async function nestListConversationsEnriched(): Promise<EnrichedConversation[]> {
  const rows = await nestListConversations();
  const courierIds = [...new Set(rows.map((c) => c.courier_id).filter(Boolean))] as string[];
  const businessIds = [...new Set(rows.map((c) => c.business_id).filter(Boolean))] as string[];
  const jobIds = [...new Set(rows.map((c) => c.job_id).filter(Boolean))] as string[];

  const [couriers, businesses, jobs] = await Promise.all([
    Promise.all(courierIds.map((id) => nestGetCourier(id).catch(() => null))),
    Promise.all(businessIds.map((id) => nestGetCustomer(id).catch(() => null))),
    Promise.all(jobIds.map((id) => nestGetJob(id).catch(() => null))),
  ]);

  const courierById = new Map(couriers.filter(Boolean).map((c) => [c!.id, c!]));
  const businessById = new Map(businesses.filter(Boolean).map((b) => [b!.id, b!]));
  const jobById = new Map(jobs.filter(Boolean).map((j) => [j!.id, j!]));

  return rows.map((c) => ({
    ...c,
    courier: c.courier_id
      ? { full_name: courierById.get(c.courier_id)?.full_name ?? null }
      : null,
    business: c.business_id
      ? { name: (businessById.get(c.business_id)?.name ?? businessById.get(c.business_id)?.business_name ?? null) as string | null }
      : null,
    job: c.job_id
      ? {
          id: c.job_id,
          pickup_address: (jobById.get(c.job_id)?.pickup_address as string | null | undefined) ?? null,
          dropoff_address: (jobById.get(c.job_id)?.dropoff_address as string | null | undefined) ?? null,
        }
      : null,
  }));
}
