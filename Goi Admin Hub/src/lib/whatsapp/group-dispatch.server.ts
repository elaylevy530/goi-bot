/**
 * Send a WhatsApp GROUP notification when a new job is dispatched.
 *
 * POC: instead of relying on per-courier pushes (which are partial),
 * broadcast the job to a shared WhatsApp group so any courier / mover in
 * the group sees it immediately. The message contains a deep link into
 * /courier/new-jobs?jobId=... — that route requires login, so the first
 * courier who taps and signs in reaches the standard job screen with map.
 *
 * Group ids are configured via env secrets:
 *   WHATSAPP_COURIERS_GROUP_ID  — group for regular deliveries
 *   WHATSAPP_MOVERS_GROUP_ID    — group for small_move / big_move jobs
 * Values may be raw group id ("120363...") or full chatId ("...@g.us").
 * If a group id is missing, that channel is silently skipped.
 */

import { greenSendGroupText } from "../green-api.internal.server";
import { buildJobMessage, type JobMessageInput } from "./job-message-template";

type JobLike = {
  id: string;
  job_number?: string | number | null;
  short_code?: string | null;
  service_category?: string | null;
  job_type?: string | null;
  package_type?: string | null;
  package_size?: string | null;
  number_of_packages?: number | null;
  fragile?: boolean | null;
  description?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  pickup_notes?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  dropoff_building?: string | null;
  dropoff_entrance?: string | null;
  dropoff_floor?: string | null;
  dropoff_apartment?: string | null;
  dropoff_notes?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  estimated_distance_km?: number | null;
  vehicle_required?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  delivery_deadline?: string | null;
  suggested_courier_payment?: number | null;
  payment?: number | null;
  customer_id?: string | null;
  business_name?: string | null;
};

async function pickGroupId(
  job: JobLike,
): Promise<{ groupId: string | null; kind: "movers" | "couriers" }> {
  const svc = String(job.service_category ?? "");
  const isMove = svc === "small_move" || svc === "big_move";
  const kind: "movers" | "couriers" = isMove ? "movers" : "couriers";

  // Preferred: DB-configured group ids (admin picks from UI).
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("whatsapp_dispatch_settings")
      .select("couriers_group_id, movers_group_id")
      .eq("id", true)
      .maybeSingle();
    const dbId =
      kind === "movers"
        ? (data as any)?.movers_group_id
        : (data as any)?.couriers_group_id;
    if (dbId) return { groupId: String(dbId), kind };
  } catch (e) {
    console.warn("[group-dispatch] db lookup failed, falling back to env:", e);
  }

  // Fallback: env secrets (legacy).
  const envId =
    kind === "movers"
      ? process.env.WHATSAPP_MOVERS_GROUP_ID
      : process.env.WHATSAPP_COURIERS_GROUP_ID;
  return { groupId: envId ?? null, kind };
}


function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_PUBLIC_URL ||
    "https://goi-bot.lovable.app"
  ).replace(/\/+$/, "");
}

export type PartnerContext = {
  name: string;
  contact_phone?: string | null;
  whatsapp_group_id?: string | null;
  dispatch_note?: string | null;
  message_sections?: Record<string, boolean> | null;
  message_cta?: string | null;
};

export async function sendJobToWhatsAppGroup(
  job: JobLike,
  partner?: PartnerContext | null,
): Promise<
  { skipped: true; reason: string } | { sent: true; kind: "movers" | "couriers"; groupId: string }
> {
  const picked = await pickGroupId(job);
  const kind = picked.kind;
  // A partner may override the target group; otherwise the general group is used.
  const groupId = partner?.whatsapp_group_id || picked.groupId;
  if (!groupId) {
    return { skipped: true, reason: `no ${kind} group id configured` };
  }

  const link = job.short_code
    ? `${publicBaseUrl()}/g/${job.short_code}`
    : `${publicBaseUrl()}/j/${job.id}`;

  const text = buildJobMessage(job as JobMessageInput, {
    sections: partner?.message_sections ?? null,
    link,
    cta: partner?.message_cta ?? null,
    partnerNote: partner?.dispatch_note ?? null,
  });

  await greenSendGroupText(groupId, text);
  return { sent: true, kind, groupId };
}

/**
 * Notify the group that a job was taken by a courier.
 * Kept intentionally short — just enough so the group sees it's no longer open.
 */
export async function sendJobTakenToWhatsAppGroup(
  job: JobLike,
  courierName?: string | null,
): Promise<
  { skipped: true; reason: string } | { sent: true; kind: "movers" | "couriers"; groupId: string }
> {
  const { groupId, kind } = await pickGroupId(job);
  if (!groupId) return { skipped: true, reason: `no ${kind} group id configured` };

  const isMove =
    job.service_category === "small_move" || job.service_category === "big_move";
  const pickupLine =
    [job.pickup_address, job.pickup_area].filter(Boolean).join(", ").trim() || "—";
  const dropoffLine =
    [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ").trim() || "—";

  const lines = [
    `✅ *${isMove ? "ההובלה נתפסה" : "המשלוח נתפס"}*`,
    courierName ? `🧑‍✈️ נלקח ע"י ${courierName}` : "",
    `📍 מ: ${pickupLine}`,
    `🎯 ל: ${dropoffLine}`,
  ].filter(Boolean);

  await greenSendGroupText(groupId, lines.join("\n"));
  return { sent: true, kind, groupId };
}
