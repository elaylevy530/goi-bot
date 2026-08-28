import type { QueryClient } from "@tanstack/react-query";
import { splitWorkingAreas } from "@/lib/regions";

export type CourierSelfRow = {
  id?: string;
  full_name?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  courier_status?: string | null;
  accepting_jobs?: boolean | null;
  is_paused?: boolean | null;
  vehicle_type?: string | null;
  vehicle_label?: string | null;
  working_areas?: string[] | null;
  base_city?: string | null;
  bank_details_verified?: boolean | null;
  invoice_status?: string | null;
};

export function courierInitials(name?: string | null) {
  if (!name) return "ש";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

export function courierActiveStatus(
  me: Pick<CourierSelfRow, "courier_status" | "accepting_jobs" | "is_paused"> | null | undefined,
  workerLabel: string,
) {
  const approved = me?.courier_status === "פעיל" && me?.is_paused !== true;
  const available = approved && me?.accepting_jobs !== false;
  const label = available
    ? `${workerLabel} פעיל`
    : approved
      ? `${workerLabel} לא פעיל`
      : me?.courier_status
        ? String(me.courier_status)
        : workerLabel;
  return { approved, available, label };
}

export function formatCourierWorkAreas(
  me: Pick<CourierSelfRow, "working_areas" | "base_city"> | null | undefined,
): string | null {
  const { selected, legacy } = splitWorkingAreas(me?.working_areas);
  const parts = [...selected, ...legacy];
  if (parts.length) return parts.join(" · ");
  const city = me?.base_city?.trim();
  return city || null;
}

export function displayOrDash(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

/** Same sign-out path as the courier side drawer. */
export async function signOutCourierSession(qc: QueryClient): Promise<"/auth" | "/dashboard"> {
  await qc.cancelQueries();
  qc.clear();
  const { isNestPreviewReadOnly, nestExitPreview, nestLogout } = await import("@/lib/nest-auth");
  if (isNestPreviewReadOnly()) {
    await nestExitPreview();
    return "/dashboard";
  }
  nestLogout();
  return "/auth";
}
