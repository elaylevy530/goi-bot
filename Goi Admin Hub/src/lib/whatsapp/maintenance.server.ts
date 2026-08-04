/**
 * WhatsApp Maintenance Mode gate.
 *
 * When enabled, only phone numbers in the allowlist may receive outbound
 * WhatsApp messages. Everyone else is silently blocked. Used for testing the
 * bot end-to-end without spamming real couriers/customers.
 *
 * Reads from public.wa_maintenance (singleton row, admin-managed via UI).
 * Cached in-memory for 10s to avoid hitting the DB on every send.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type MaintenanceState = {
  enabled: boolean;
  allowlist: string[]; // normalized digits-only
};

let cached: { at: number; value: MaintenanceState } | null = null;
const TTL_MS = 10_000;

/** Normalize Israeli phone to digits only (no +, no chatId suffix). */
export function normalizePhoneDigits(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "972" + p.slice(1);
  if (!p.startsWith("972") && p.length === 9) p = "972" + p;
  return p;
}

export async function getMaintenanceState(force = false): Promise<MaintenanceState> {
  const now = Date.now();
  if (!force && cached && now - cached.at < TTL_MS) return cached.value;
  try {
    const { data } = await supabaseAdmin
      .from("wa_maintenance")
      .select("enabled, allowlist")
      .eq("id", true)
      .maybeSingle();
    const value: MaintenanceState = {
      enabled: !!data?.enabled,
      allowlist: Array.isArray(data?.allowlist)
        ? (data!.allowlist as string[]).map(normalizePhoneDigits).filter(Boolean)
        : [],
    };
    cached = { at: now, value };
    return value;
  } catch {
    return { enabled: false, allowlist: [] };
  }
}

export function invalidateMaintenanceCache() {
  cached = null;
}

/** Returns true when sending to `phone` is allowed under maintenance mode. */
export async function isSendAllowed(phone: string): Promise<{ allowed: boolean; reason?: string }> {
  const state = await getMaintenanceState();
  if (!state.enabled) return { allowed: true };
  const target = normalizePhoneDigits(phone);
  if (state.allowlist.includes(target)) return { allowed: true };
  return { allowed: false, reason: "maintenance_mode_block" };
}
