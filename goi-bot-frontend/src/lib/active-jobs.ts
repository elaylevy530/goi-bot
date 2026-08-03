import { haversineKm, type LatLng } from "@/lib/google-driving-route";
import type { NestJob } from "@/lib/nest-jobs";

const CLOSED = new Set(["הושלמה", "בוטלה"]);

export function isActiveJobStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  if (CLOSED.has(status)) return false;
  if (status === "טיוטה") return false;
  return true;
}

export function jobPickupLatLng(job: NestJob): LatLng | null {
  const lat = Number((job as any).pickup_lat);
  const lng = Number((job as any).pickup_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function jobDropoffLatLng(job: NestJob): LatLng | null {
  const lat = Number((job as any).dropoff_lat);
  const lng = Number((job as any).dropoff_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Unassigned first, then oldest waiting (ops urgency). */
export function sortActiveJobs(jobs: NestJob[]): NestJob[] {
  return [...jobs].sort((a, b) => {
    const aAssigned = a.selected_courier_id ? 1 : 0;
    const bAssigned = b.selected_courier_id ? 1 : 0;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });
}

export type NearbyCourier = {
  id: string;
  full_name: string;
  vehicle_type?: string | null;
  whatsapp_phone?: string | null;
  last_lat: number;
  last_lng: number;
  last_location_at?: string | null;
  distanceKm: number;
};

export function nearbyCouriersFrom(
  couriers: Array<{
    id: string;
    full_name?: string | null;
    vehicle_type?: string | null;
    whatsapp_phone?: string | null;
    last_lat?: number | null;
    last_lng?: number | null;
    last_location_at?: string | null;
  }>,
  origin: LatLng | null,
  maxKm = 15,
  freshMinutes = 30,
): NearbyCourier[] {
  const cutoff = Date.now() - freshMinutes * 60_000;
  const out: NearbyCourier[] = [];

  for (const c of couriers) {
    if (c.last_lat == null || c.last_lng == null) continue;
    if (c.last_location_at && new Date(c.last_location_at).getTime() < cutoff) continue;
    const pos = { lat: Number(c.last_lat), lng: Number(c.last_lng) };
    if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) continue;
    const distanceKm = origin
      ? Math.round(haversineKm(origin, pos) * 10) / 10
      : 0;
    if (origin && distanceKm > maxKm) continue;
    out.push({
      id: c.id,
      full_name: c.full_name ?? "שליח",
      vehicle_type: c.vehicle_type ?? null,
      whatsapp_phone: c.whatsapp_phone ?? null,
      last_lat: pos.lat,
      last_lng: pos.lng,
      last_location_at: c.last_location_at ?? null,
      distanceKm,
    });
  }

  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export function minutesAgoLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} ד׳`;
  return `לפני ${Math.floor(m / 60)} ש׳`;
}

export function waitingMinutes(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}
