import { nestServerFetch } from "@/lib/nest-server";

type MaintenanceState = { enabled: boolean; allowlist: string[] };
let cached: { at: number; value: MaintenanceState } | null = null;

export function normalizePhoneDigits(phone: string): string {
  let value = phone.replace(/[^\d+]/g, "");
  if (value.startsWith("+")) value = value.slice(1);
  if (value.startsWith("0")) value = `972${value.slice(1)}`;
  if (!value.startsWith("972") && value.length === 9) value = `972${value}`;
  return value;
}

/**
 * Server-only maintenance gate for WhatsApp send paths.
 * Uses CronSecret (not admin JWT) — Nest exposes a read-only internal route.
 */
export async function getMaintenanceState(force = false): Promise<MaintenanceState> {
  if (!force && cached && Date.now() - cached.at < 10_000) return cached.value;
  try {
    const value = await nestServerFetch<MaintenanceState>(
      "/api/public/whatsapp-maintenance",
      { cronSecret: true },
    );
    cached = {
      at: Date.now(),
      value: {
        enabled: !!value.enabled,
        allowlist: (value.allowlist ?? []).map(normalizePhoneDigits),
      },
    };
    return cached.value;
  } catch {
    return { enabled: false, allowlist: [] };
  }
}

export function invalidateMaintenanceCache() { cached = null; }

export async function isSendAllowed(phone: string): Promise<{ allowed: boolean; reason?: string }> {
  const state = await getMaintenanceState();
  return !state.enabled || state.allowlist.includes(normalizePhoneDigits(phone))
    ? { allowed: true }
    : { allowed: false, reason: "maintenance_mode_block" };
}
