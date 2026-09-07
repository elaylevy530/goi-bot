import type { QueryClient } from "@tanstack/react-query";
import {
  expandWorkAreasForCards,
  NATIONWIDE_WORK_AREA,
  splitWorkingAreas,
  WORK_AREA_CARDS,
  workAreaOf,
} from "@/lib/regions";

export type CourierSelfRow = {
  id?: string;
  full_name?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  id_number?: string | null;
  avatar_url?: string | null;
  courier_status?: string | null;
  accepting_jobs?: boolean | null;
  has_live_active_job?: boolean | null;
  is_paused?: boolean | null;
  admin_jobs_blocked?: boolean | null;
  location_sharing_enabled?: boolean | null;
  work_distance_from_base?: string | null;
  courier_number?: string | null;
  vehicle_type?: string | null;
  vehicle_label?: string | null;
  vehicle_plate?: string | null;
  vehicle_year?: number | null;
  working_areas?: string[] | null;
  base_city?: string | null;
  bank_details_verified?: boolean | null;
  invoice_status?: string | null;
  business_type?: string | null;
  tax_id?: string | null;
  invoice_name?: string | null;
  id_photo_url?: string | null;
  id_photo_back_url?: string | null;
};

export const COURIER_DOCUMENT_TYPES = [
  { type: "driver_license", label: "רישיון נהיגה" },
  { type: "comprehensive_insurance", label: "ביטוח חובה" },
] as const;

export type CourierDocumentType = (typeof COURIER_DOCUMENT_TYPES)[number]["type"];

export function courierInitials(name?: string | null) {
  if (!name) return "ש";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("");
}

export const LIVE_JOB_OFFLINE_ERROR = "לא ניתן לעבור למצב לא זמין בזמן משלוח פעיל";

export function courierHasLiveActiveJob(
  me: Pick<CourierSelfRow, "has_live_active_job"> | null | undefined,
) {
  return me?.has_live_active_job === true;
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
  const stored = me?.working_areas ?? [];
  if (stored.some((a) => a === NATIONWIDE_WORK_AREA || a.includes(NATIONWIDE_WORK_AREA))) {
    return NATIONWIDE_WORK_AREA;
  }
  const regionLabels = expandWorkAreasForCards(stored).map((storedArea) => {
    const card = WORK_AREA_CARDS.find((c) => c.stored === storedArea);
    return card?.label ?? storedArea.replace(/^אזור\s+/, "");
  });
  if (regionLabels.length) return regionLabels.join(" · ");

  const { legacy } = splitWorkingAreas(stored);
  const fromCities = [...new Set(legacy.map((city) => workAreaOf(city)).filter(Boolean))]
    .map((area) => WORK_AREA_CARDS.find((c) => c.stored === area)?.label ?? String(area).replace(/^אזור\s+/, ""));
  if (fromCities.length) return fromCities.join(" · ");

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
