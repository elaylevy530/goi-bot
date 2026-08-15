import { isWorkAreaLabel, locationMatchesWorkAreas, NATIONWIDE_WORK_AREA } from "@/lib/regions";

const OPEN_JOB_STATUSES = new Set(["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו"]);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isFreshCreatedAt(createdAt?: string | null, hours = 2) {
  if (!createdAt) return false;
  return new Date(createdAt).getTime() >= Date.now() - hours * 60 * 60 * 1000;
}

function isFutureJobDate(jobDate?: string | null) {
  return !jobDate || jobDate >= todayIsoDate();
}

function textList(...values: unknown[]) {
  return values
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean);
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

function hasFreshGps(courier?: any | null) {
  if (courier?.location_sharing_enabled !== true || courier?.last_lat == null || courier?.last_lng == null) return false;
  if (!courier?.last_location_at) return true;
  return new Date(courier.last_location_at).getTime() >= Date.now() - 30 * 60 * 1000;
}

export function isCourierReceivingJobs(courier?: any | null) {
  if (courier?.courier_status !== "פעיל") return false;
  if (courier?.is_paused === true) return false;
  // admin_jobs_blocked is an invisible admin flag — courier still sees themselves as active,
  // but the dispatcher must NOT send them work.
  if (courier?.admin_jobs_blocked === true) return false;
  // accepting_jobs is the courier-controlled toggle from the in-app panel only.
  if (courier?.accepting_jobs === false) return false;
  return true;
}


// Approved = visible status to the courier.
// Paused couriers are hidden from the jobs feed entirely — admin pauses
// them precisely to stop sending work without telling them.
export function isCourierApproved(courier?: any | null) {
  return courier?.courier_status === "פעיל" && courier?.is_paused !== true;
}



function radiusKmFromLabel(label?: string | null): number {
  if (!label) return 15;
  if (label.includes("כל הארץ")) return 200;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 5;
  const m = String(label).match(/(\d+)/);
  return m ? Math.max(2, Math.min(200, parseInt(m[1], 10))) : 15;
}

function normJobType(v?: string | null) {
  return String(v ?? "")
    .replace(/[\s/\\|·\-–—]+/g, "")
    .trim();
}

/** True when the job is a moving job (small/big move), by category or job type text. */
export function isMoveJob(job: any) {
  const service = String(job?.service_category ?? "");
  if (service === "small_move" || service === "big_move") return true;
  const txt = `${job?.job_type ?? ""} ${job?.item_category ?? ""}`;
  return /הובל|פירוק|פינוי/.test(txt);
}

/** Job belongs to this courier kind (mover -> moves only, courier -> deliveries only). */
export function jobMatchesKind(job: any, courier?: any | null) {
  const isMove = isMoveJob(job);
  const courierKind = courier?.courier_kind === "mover" ? "mover" : "courier";
  return isMove ? courierKind === "mover" : courierKind === "courier";
}

function courierSupportsJobType(job: any, courier?: any | null) {
  const service = String(job?.service_category ?? "");
  if (!jobMatchesKind(job, courier)) return false;


  // Movers see every moving job — their profile job type is generic ("אחר").
  if (isMoveJob(job) && courier?.courier_kind === "mover") return true;

  const jobTypes = textList(courier?.job_types);
  if (jobTypes.length === 0 || jobTypes.includes("*") || jobTypes.includes("אחר")) return true;

  const serviceWanted = service === "small_move"
    ? ["הובלה קטנה", "פריט בודד", "פירוק והרכבה"]
    : service === "big_move"
      ? ["הובלת דירה", "הובלה גדולה", "הובלת משרד", "הובלה בין עירונית"]
      : service === "same_day" || service === "scheduled"
        ? ["משלוח בודד", "חבילות / מסמכים"]
        : [];
  const wanted = textList(serviceWanted, job?.job_type, job?.package_type, job?.item_category)
    .map((v) => normJobType(v))
    .filter(Boolean);
  if (wanted.length === 0) return true;

  const supports = jobTypes.map((v) => normJobType(v)).filter(Boolean);
  return supports.some((support) =>
    wanted.some((want) => {
      if (support === want || support.includes(want) || want.includes(support)) return true;
      if ((support.includes("אוכל") || support.includes("מזון") || support.includes("מסעד"))
        && (want.includes("אוכל") || want.includes("מזון") || want.includes("מסעד"))) return true;
      if ((support.includes("חבילה") || support.includes("מסמך"))
        && (want.includes("חבילה") || want.includes("מסמך"))) return true;
      if ((support.includes("הובלה") || support.includes("הובלת") || support.includes("פינוי") || support.includes("פירוק"))
        && (want.includes("הובלה") || want.includes("הובלת") || want.includes("פינוי") || want.includes("פירוק"))) return true;
      return false;
    }),
  );
}

export function matchesCourier(job: any, courier?: any | null) {
  if (!courier) return false;
  if (!courierSupportsJobType(job, courier)) return false;
  if (job?.vehicle_required) {
    const vehicles = textList(courier.vehicle_type, courier.vehicle_types);
    if (vehicles.length > 0 && !vehicles.includes(job.vehicle_required)) return false;
  }

  const personalRadius = radiusKmFromLabel(courier.work_distance_from_base);
  const pickup = String(job?.pickup_area || job?.pickup_address || "").trim();
  if (hasFreshGps(courier)) {
    const km = distanceKm(job?.pickup_lat, job?.pickup_lng, courier.last_lat, courier.last_lng);
    if (km != null && km <= personalRadius) return true;
  }

  if (!pickup) return true;

  const workAreas = textList(courier.working_areas);
  const usesFixedAreas = workAreas.some((a) => isWorkAreaLabel(a) || a.includes(NATIONWIDE_WORK_AREA));
  const areas = usesFixedAreas
    ? workAreas
    : textList(
        courier.working_areas,
        courier.pickup_areas,
        courier.base_city,
        courier.custom_work_area,
        courier.custom_pickup_area,
      );
  return locationMatchesWorkAreas(pickup, areas);
}


export function isOpenBroadcastJobForCourier(job: any, courier?: any | null) {
  return isCourierReceivingJobs(courier)
    && !!job
    && job.selected_courier_id == null
    && job.status === "נשלחה לשליחים"
    && job.pricing_type !== "quote_request"
    && isFutureJobDate(job.job_date)
    && matchesCourier(job, courier);
}

export function isOpenQuoteJobForCourier(job: any, courier?: any | null) {
  const deadlineOk = job?.quote_deadline_at
    ? new Date(job.quote_deadline_at).getTime() > Date.now()
    : true;
  return isCourierReceivingJobs(courier)
    && !!job
    && job.selected_quote_id == null
    && job.pricing_type === "quote_request"
    && OPEN_JOB_STATUSES.has(String(job.status ?? ""))
    && deadlineOk
    && isFutureJobDate(job.job_date)
    && matchesCourier(job, courier);
}

export function isLivePendingOffer(offer: any, courier?: any | null) {
  const job = Array.isArray(offer?.jobs) ? offer.jobs[0] : offer?.jobs;
  if (!isCourierReceivingJobs(courier) || !job || offer?.response !== "pending") return false;
  if (offer?.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) return false;
  return job.selected_courier_id == null
    && OPEN_JOB_STATUSES.has(String(job.status ?? ""))
    && job.pricing_type !== "quote_request"
    && isFutureJobDate(job.job_date)
    && matchesCourier(job, courier);
}

