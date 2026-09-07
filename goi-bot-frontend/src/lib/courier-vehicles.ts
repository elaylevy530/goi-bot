/** Canonical stored vehicle values — shared by join, courier, business, and admin. */
export const COURIER_VEHICLE_OPTIONS = [
  { value: "קטנוע", label: "אופנוע / קטנוע" },
  { value: "אופניים חשמליים", label: "אופניים חשמליים" },
  { value: "אופניים רגילים", label: "אופניים רגילים" },
  { value: "קורקינט חשמלי", label: "קורקינט חשמלי" },
  { value: "רכב", label: "רכב" },
  { value: "טנדר", label: "טנדר" },
  { value: "הליכה", label: "הליכה" },
] as const;

/** Vehicles a business can require on a delivery job. */
export const BUSINESS_JOB_VEHICLES = [
  { value: "קטנוע", label: "אופנוע / קטנוע" },
  { value: "רכב", label: "רכב" },
  { value: "טנדר", label: "טנדר" },
] as const;

export const COURIER_VEHICLE_VALUES = COURIER_VEHICLE_OPTIONS.map((o) => o.value);

export function canonicalizeVehicleValue(raw?: string | null): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (v === "אופנוע" || v === "קורקינט / אופנוע") return "קטנוע";
  if (v === "הולך רגל") return "הליכה";
  if (v === "אופניים") return "אופניים חשמליים";
  return v;
}

export function vehicleLabel(raw?: string | null): string {
  const canonical = canonicalizeVehicleValue(raw);
  return COURIER_VEHICLE_OPTIONS.find((o) => o.value === canonical)?.label ?? (raw?.trim() || "—");
}
