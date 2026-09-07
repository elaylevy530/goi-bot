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

function distanceKm(aLat?: unknown, aLng?: unknown, bLat?: unknown, bLng?: unknown) {
  const lat1 = Number(aLat);
  const lng1 = Number(aLng);
  const lat2 = Number(bLat);
  const lng2 = Number(bLng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function radiusKmFromLabel(label?: string | null): number {
  if (!label) return 15;
  if (label.includes("כל הארץ")) return 200;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 5;
  const m = String(label).match(/(\d+)/);
  return m ? Math.max(2, Math.min(200, parseInt(m[1], 10))) : 15;
}

function hasFreshGps(courier?: {
  location_sharing_enabled?: boolean | null;
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_at?: Date | string | null;
} | null) {
  if (courier?.location_sharing_enabled !== true || courier?.last_lat == null || courier?.last_lng == null) {
    return false;
  }
  if (!courier.last_location_at) return true;
  return new Date(courier.last_location_at).getTime() >= Date.now() - 30 * 60 * 1000;
}

function pickupMatchesWorkAreas(
  job: { pickup_area?: string | null; pickup_address?: string | null } | null | undefined,
  courier: {
    working_areas?: string[] | null;
    pickup_areas?: string[] | null;
    base_city?: string | null;
    custom_work_area?: string | null;
  } | null | undefined,
) {
  const pickup = String(job?.pickup_area || job?.pickup_address || "").trim();
  const areas = [
    ...(courier?.working_areas ?? []),
    ...(courier?.pickup_areas ?? []),
    courier?.base_city,
    courier?.custom_work_area,
  ]
    .filter(Boolean)
    .map((a) => String(a).trim())
    .filter(Boolean);
  if (areas.some((a) => a.includes("כל הארץ"))) return true;
  if (!pickup) return true;
  const p = pickup.toLowerCase();
  return areas.some((area) => {
    const a = area.toLowerCase();
    return p.includes(a) || a.includes(p);
  });
}

export function courierIsNearbyOrMatching(
  job?: {
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    pickup_area?: string | null;
    pickup_address?: string | null;
  } | null,
  courier?: {
    location_sharing_enabled?: boolean | null;
    last_lat?: number | null;
    last_lng?: number | null;
    last_location_at?: Date | string | null;
    work_distance_from_base?: string | null;
    working_areas?: string[] | null;
    pickup_areas?: string[] | null;
    base_city?: string | null;
    custom_work_area?: string | null;
  } | null,
) {
  if (!courier) return false;
  const radius = radiusKmFromLabel(courier.work_distance_from_base);
  if (hasFreshGps(courier)) {
    const km = distanceKm(job?.pickup_lat, job?.pickup_lng, courier.last_lat, courier.last_lng);
    if (km != null && km <= radius) return true;
  }
  return pickupMatchesWorkAreas(job, courier);
}

export function pickDispatchCouriers<T extends {
  vehicle_type?: string | null;
  vehicle_types?: string[] | null;
  vehicle_label?: string | null;
  location_sharing_enabled?: boolean | null;
  last_lat?: number | null;
  last_lng?: number | null;
  last_location_at?: Date | string | null;
  work_distance_from_base?: string | null;
  working_areas?: string[] | null;
  pickup_areas?: string[] | null;
  base_city?: string | null;
  custom_work_area?: string | null;
}>(
  job: {
    vehicle_required?: string | null;
    package_size?: string | null;
    item_category?: string | null;
    package_type?: string | null;
    description?: string | null;
    job_type?: string | null;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    pickup_area?: string | null;
    pickup_address?: string | null;
  },
  eligible: T[],
) {
  const vehicleOk = eligible.filter((c) => courierVehicleFitsJob(job, c));
  const nearby = vehicleOk.filter((c) => courierIsNearbyOrMatching(job, c));
  if (nearby.length) return nearby;
  if (vehicleOk.length) return vehicleOk;
  return eligible;
}
