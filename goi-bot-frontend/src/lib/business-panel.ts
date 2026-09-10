import type { NestJob } from "@/lib/nest-jobs";

export const WAITING_STATUSES = new Set([
  "טיוטה",
  "נשלחה לשליחים",
  "ממתינה לתגובות",
  "יש שליחים שאישרו",
]);

export const ACTIVE_STATUSES = new Set(["נבחר שליח", "פעילה"]);
export const DONE_STATUSES = new Set(["הושלמה"]);
export const CANCELLED_STATUSES = new Set(["בוטלה"]);

export function jobPrice(job: NestJob): number {
  return Number(
    (job as { customer_price?: number | null }).customer_price ??
      job.payment ??
      0,
  );
}

export function jobCourierName(job: NestJob): string | null {
  const nested = (job as { couriers?: { full_name?: string | null } | null }).couriers;
  return (
    nested?.full_name ||
    (job as { selected_courier_name?: string | null }).selected_courier_name ||
    null
  );
}

export function jobCourierVehicle(job: NestJob): string | null {
  const nested = (job as { couriers?: { vehicle_type?: string | null; vehicle_label?: string | null } | null }).couriers;
  return nested?.vehicle_label || nested?.vehicle_type || null;
}

export function jobCourierLabel(job: NestJob): string {
  const name = jobCourierName(job);
  const vehicle = jobCourierVehicle(job);
  if (name && vehicle) return `${name} (${vehicle})`;
  return name || "—";
}

export function jobCourierAvatar(job: NestJob): string | null {
  const nested = (job as { couriers?: { avatar_url?: string | null } | null }).couriers;
  return nested?.avatar_url || null;
}

export function jobDurationLabel(job: NestJob): string {
  const start = job.created_at ? new Date(job.created_at).getTime() : NaN;
  const end = new Date(String((job as { updated_at?: string }).updated_at || job.created_at || "")).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "—";
  const min = Math.round((end - start) / 60_000);
  if (min < 1) return "<1 דק׳";
  return `${min} דק׳`;
}

export function jobEtaMinutes(job: NestJob): number | null {
  const snap = (job as { pricing_snapshot?: { delivery_deadline?: string | null } | null }).pricing_snapshot;
  const deadline = snap?.delivery_deadline;
  if (!deadline) return null;
  const t = new Date(deadline).getTime();
  if (!Number.isFinite(t)) return null;
  const remaining = Math.round((t - Date.now()) / 60_000);
  return remaining > 0 ? remaining : null;
}

export function etaToneColor(minutes: number | null): string {
  if (minutes == null) return "#27875a";
  if (minutes <= 12) return "#087d52";
  if (minutes <= 28) return "#c47a22";
  return "#c45c4a";
}

export function formatEtaClock(job: NestJob): string {
  const min = jobEtaMinutes(job);
  if (min == null) return "—";
  return new Date(Date.now() + min * 60_000).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeHe(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function formatHebrewDate(d = new Date()): string {
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatJobWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startThat) / 86_400_000);
  if (diffDays === 0) return `היום, ${time}`;
  if (diffDays === 1) return `אתמול, ${time}`;
  return `${d.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}, ${time}`;
}

export function isSameDay(iso?: string | null, ref = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export function isSameMonth(iso?: string | null, ref = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function statusPillClass(status: string): string {
  if (DONE_STATUSES.has(status)) return "bg-success-bg text-success-text";
  if (ACTIVE_STATUSES.has(status) || status === "יש שליחים שאישרו") return "bg-kpi-volume-bg text-info-text";
  if (CANCELLED_STATUSES.has(status) || status === "תקועה") return "bg-danger-bg text-danger-text";
  if (WAITING_STATUSES.has(status)) return "bg-warning-bg text-warning-text";
  return "bg-muted text-text-muted";
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatDelta(delta: number | null, unit = "%"): string | null {
  if (delta == null || !Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${unit}`;
}

export function avgDeliveryMinutes(jobs: NestJob[]): number | null {
  const done = jobs.filter((j) => DONE_STATUSES.has(j.status) && j.created_at);
  if (done.length < 2) return null;
  const minutes = done
    .map((j) => {
      const start = new Date(j.created_at!).getTime();
      const end = new Date(String((j as { updated_at?: string }).updated_at || j.created_at)).getTime();
      return (end - start) / 60_000;
    })
    .filter((m) => m > 0 && m < 24 * 60);
  if (minutes.length < 2) return null;
  return Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
}

export function courierStepProgress(job: NestJob): number {
  const step = String((job as { courier_step?: string | null }).courier_step ?? "");
  if (job.status === "הושלמה" || step === "נמסר") return 100;
  if (step === "אספתי") return 75;
  if (step === "בדרך לאיסוף") return 40;
  if (step === "שליח אישר" || job.selected_courier_id) return 20;
  return 8;
}

export function courierStepLabel(job: NestJob): string {
  const step = String((job as { courier_step?: string | null }).courier_step ?? "");
  if (job.status === "הושלמה" || step === "נמסר") return "נמסר";
  if (step === "אספתי") return "בדרך למסירה";
  if (step === "בדרך לאיסוף") return "בדרך לאיסוף";
  if (ACTIVE_STATUSES.has(job.status)) return "בטיפול";
  if (WAITING_STATUSES.has(job.status)) return "ממתין לשיבוץ";
  return job.status;
}

export type LiveMapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: string;
  type?: "store" | "courier" | "destination";
};

export function jobRecipientName(job: NestJob): string {
  return (
    (job as { recipient_name?: string | null }).recipient_name ||
    job.guest_name ||
    job.customer_name ||
    "לקוח"
  );
}

export function jobRecipientPhone(job: NestJob): string {
  return (
    (job as { recipient_phone?: string | null }).recipient_phone ||
    job.guest_phone ||
    job.customer_phone ||
    ""
  );
}

export function jobSourceLabel(job: NestJob): string {
  const via = String((job as { created_via?: string | null }).created_via || "");
  if (via === "integration" || via === "webhook" || via === "intake") return "אינטגרציה";
  if ((job as { partner_id?: string | null }).partner_id) return "שותף";
  if (job.pricing_type === "quote_request") return "מכרז";
  if (job.guest_name) return "אורח";
  return "ידני";
}

export function jobItemsLabel(job: NestJob): string {
  return String(job.description || (job as { items?: string | null }).items || job.job_type || "משלוח");
}

export function jobHasCourier(job: NestJob): boolean {
  return Boolean(job.selected_courier_id);
}

export function isIncomingJob(job: NestJob): boolean {
  if (CANCELLED_STATUSES.has(job.status) || DONE_STATUSES.has(job.status)) return false;
  if (job.status === "טיוטה") return true;
  if (job.pricing_type === "quote_request" && !job.selected_courier_id) return true;
  return false;
}

export function isTrackingJob(job: NestJob): boolean {
  if (DONE_STATUSES.has(job.status) || CANCELLED_STATUSES.has(job.status) || job.status === "טיוטה") return false;
  if (job.pricing_type === "quote_request" && !job.selected_courier_id) return false;
  return WAITING_STATUSES.has(job.status) || ACTIVE_STATUSES.has(job.status);
}

export function isHistoryJob(job: NestJob): boolean {
  return DONE_STATUSES.has(job.status) || CANCELLED_STATUSES.has(job.status);
}

export function trackingGroup(job: NestJob): "waiting" | "pickup" | "delivery" {
  const step = String((job as { courier_step?: string | null }).courier_step ?? "");
  if (step === "אספתי" || step === "נמסר") return "delivery";
  if (step === "בדרך לאיסוף") return "pickup";
  if (ACTIVE_STATUSES.has(job.status) && job.selected_courier_id) {
    if (step === "שליח אישר") return "pickup";
    return "delivery";
  }
  return "waiting";
}

export function trackingStageIndex(job: NestJob): number {
  const group = trackingGroup(job);
  if (group === "delivery") return String((job as { courier_step?: string | null }).courier_step) === "אספתי" || job.status === "פעילה" ? 2 : 3;
  if (group === "pickup") return 1;
  return 0;
}

/** 0 אישור … 5 נמסר — for the side details sheet timeline. */
export function deliverySheetLevel(job: NestJob): number {
  if (DONE_STATUSES.has(job.status) || String((job as { courier_step?: string | null }).courier_step) === "נמסר") return 5;
  if (CANCELLED_STATUSES.has(job.status)) return -1;
  const stage = trackingStageIndex(job);
  if (stage >= 3) return 4;
  if (stage >= 2) return 3;
  if (stage >= 1) return 2;
  if (jobHasCourier(job)) return 1;
  return 0;
}

export function jobBadgeTone(status: string): string {
  if (DONE_STATUSES.has(status)) return "green";
  if (ACTIVE_STATUSES.has(status)) return "green";
  if (CANCELLED_STATUSES.has(status)) return "red";
  if (status === "יש שליחים שאישרו") return "purple";
  if (WAITING_STATUSES.has(status)) return "amber";
  return "gray";
}

export function moneyIls(n: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);
}

export function pinsFromJobs(jobs: NestJob[]): LiveMapPin[] {
  const pins: LiveMapPin[] = [];
  for (const job of jobs) {
    const row = job as {
      couriers?: { last_lat?: number | null; last_lng?: number | null; full_name?: string | null } | null;
      pickup_lat?: number | null;
      pickup_lng?: number | null;
      dropoff_lat?: number | null;
      dropoff_lng?: number | null;
    };
    const assigned = Boolean(job.selected_courier_id) && trackingGroup(job) !== "waiting";
    const cLat = Number(row.couriers?.last_lat);
    const cLng = Number(row.couriers?.last_lng);
    if (assigned && Number.isFinite(cLat) && Number.isFinite(cLng)) {
      const eta = jobEtaMinutes(job);
      pins.push({
        id: job.id,
        lat: cLat,
        lng: cLng,
        label: eta != null ? `${eta} דק׳` : row.couriers?.full_name || job.job_number,
        type: "courier",
        color: etaToneColor(eta),
      });
      continue;
    }
    const dLat = Number(row.dropoff_lat);
    const dLng = Number(row.dropoff_lng);
    if (Number.isFinite(dLat) && Number.isFinite(dLng)) {
      pins.push({
        id: job.id,
        lat: dLat,
        lng: dLng,
        label: `${job.job_number} · יעד מסירה`,
        type: "destination",
        color: "#b38235",
      });
      continue;
    }
    const pLat = Number(row.pickup_lat);
    const pLng = Number(row.pickup_lng);
    if (Number.isFinite(pLat) && Number.isFinite(pLng)) {
      pins.push({
        id: job.id,
        lat: pLat,
        lng: pLng,
        label: job.job_number,
        type: "destination",
        color: "#b38235",
      });
    }
  }
  return pins;
}

export function walletBalance(txs: Array<{ amount?: unknown }>): number {
  return txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

export function exportJobsCsv(jobs: NestJob[]) {
  const header = ["מספר", "תאריך", "איסוף", "מסירה", "שליח", "סטטוס", "עלות"];
  const rows = jobs.map((j) => [
    j.job_number,
    j.created_at ? new Date(j.created_at).toLocaleString("he-IL") : "",
    j.pickup_address || j.pickup_area || "",
    j.dropoff_address || j.dropoff_area || "",
    jobCourierName(j) || "",
    j.status,
    String(jobPrice(j)),
  ]);
  const csv = [header, ...rows]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `goi-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
