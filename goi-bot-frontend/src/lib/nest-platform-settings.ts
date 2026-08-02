/**
 * Thin Nest platform settings API helpers for browser/client code.
 */

import { apiFetch } from "@/lib/api-client";
import { getNestAccessToken } from "@/lib/nest-auth";

export type NestPlatformSetting = {
  key: string;
  value: unknown;
  updated_by?: string | null;
  updated_at?: string;
};

function token() {
  return getNestAccessToken();
}

export function nestGetPlatformSetting(key: string) {
  return apiFetch<NestPlatformSetting | null>(
    `/api/platform/settings/${encodeURIComponent(key)}`,
    { accessToken: token() },
  );
}

/** Public tile flags (no auth) for customer new-order. */
export function nestGetPublicPlatformSettings(keys: string[]) {
  const q = keys.map(encodeURIComponent).join(",");
  return apiFetch<NestPlatformSetting[]>(`/api/platform/settings/public/${q}`);
}

export async function nestReadPlatformFlag(key: string, defaultValue = true): Promise<boolean> {
  try {
    const rows = await nestGetPublicPlatformSettings([key]);
    const row = rows.find((r) => r.key === key);
    if (!row) return defaultValue;
    return row.value === true || row.value === "true";
  } catch {
    return defaultValue;
  }
}
