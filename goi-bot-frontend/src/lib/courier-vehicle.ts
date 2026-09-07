export type VehicleClass = "bike" | "moto" | "car" | "van";

const RANK: Record<VehicleClass, number> = {
  bike: 1,
  moto: 2,
  car: 3,
  van: 4,
};

function textBlob(...values: unknown[]) {
  return values
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyVehicle(raw?: string | null): VehicleClass | null {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return null;
  if (/רכב מסחרי|טנדר|משאית|van|truck|הובל/.test(t)) return "van";
  if (/רכב|מכונית|auto\b|car\b/.test(t) && !/דו.?גלגל|אופנוע|קטנוע|מסחרי/.test(t)) return "car";
  if (/אופנוע|קטנוע|motorcycle/.test(t) && !/קורקינט/.test(t)) return "moto";
  if (/אופניים|קורקינט|הליכה|bicycle|bike|walk|רגל/.test(t)) return "bike";
  return null;
}

export function courierVehicleClass(courier?: {
  vehicle_type?: string | null;
  vehicle_types?: string[] | null;
  vehicle_label?: string | null;
} | null): VehicleClass | null {
  if (!courier) return null;
  const labels = [courier.vehicle_type, courier.vehicle_label, ...(courier.vehicle_types ?? [])];
  let best: VehicleClass | null = null;
  for (const label of labels) {
    const next = classifyVehicle(label);
    if (!next) continue;
    if (!best || RANK[next] > RANK[best]) best = next;
  }
  return best;
}

function inferSizeClass(job?: {
  package_size?: string | null;
  item_category?: string | null;
  package_type?: string | null;
  description?: string | null;
  job_type?: string | null;
  vehicle_required?: string | null;
} | null): VehicleClass | null {
  const blob = textBlob(
    job?.package_size,
    job?.item_category,
    job?.package_type,
    job?.description,
    job?.job_type,
  );
  if (!blob) return null;
  if (/טנדר|רכב מסחרי|הובל|רהיט|ספה|מקרר|ארון/.test(blob)) return "van";
  if (/שק|מזון חיות|חנות חיות|מעל 20|עד 30|כבד מאוד/.test(blob)) return "car";
  if (/גדול|20\s*ק/.test(blob)) return "car";
  if (/בינוני|10\s*ק/.test(blob)) return "moto";
  if (/קטן|מעטפה|מסמך|עד 5/.test(blob)) return "bike";
  return null;
}

export function jobNeededVehicleClass(job?: {
  vehicle_required?: string | null;
  package_size?: string | null;
  item_category?: string | null;
  package_type?: string | null;
  description?: string | null;
  job_type?: string | null;
} | null): VehicleClass | null {
  const required = classifyVehicle(job?.vehicle_required);
  const size = inferSizeClass(job);
  if (required && size) return RANK[required] >= RANK[size] ? required : size;
  return required ?? size;
}

/** Larger vehicles can take smaller jobs; smaller vehicles cannot take oversized cargo. */
export function courierVehicleFitsJob(
  job?: {
    vehicle_required?: string | null;
    package_size?: string | null;
    item_category?: string | null;
    package_type?: string | null;
    description?: string | null;
    job_type?: string | null;
  } | null,
  courier?: {
    vehicle_type?: string | null;
    vehicle_types?: string[] | null;
    vehicle_label?: string | null;
  } | null,
) {
  const needed = jobNeededVehicleClass(job);
  if (!needed) return true;
  const have = courierVehicleClass(courier);
  if (!have) return true;
  return RANK[have] >= RANK[needed];
}
