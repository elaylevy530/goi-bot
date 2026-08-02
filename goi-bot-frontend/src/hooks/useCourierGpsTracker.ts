import { useEffect, useRef, useSyncExternalStore } from "react";
import { nestUpdateMyCourier } from "@/lib/nest-accounts";
import { toast } from "sonner";

// ───────────────────────── live status store ─────────────────────────
export type GpsLiveStatus = {
  enabled: boolean;
  permission: "granted" | "denied" | "prompt" | "unsupported" | "unknown";
  lastFixAt: number | null;     // ms — last position received from device
  lastSavedAt: number | null;   // ms — last successful DB write
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
};

let state: GpsLiveStatus = {
  enabled: false,
  permission: "unknown",
  lastFixAt: null,
  lastSavedAt: null,
  lat: null,
  lng: null,
  accuracy: null,
  error: null,
};
const subs = new Set<() => void>();
function setState(patch: Partial<GpsLiveStatus>) {
  state = { ...state, ...patch };
  subs.forEach((s) => s());
}
function subscribe(cb: () => void) {
  subs.add(cb);
  return () => { subs.delete(cb); };
}
function getSnapshot() { return state; }

export function useGpsLiveStatus(): GpsLiveStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ───────────────────────── tracker hook ─────────────────────────
function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const MIN_MOVE_M = 150;
const MAX_INTERVAL_MS = 120_000;
const MIN_INTERVAL_MS = 20_000;

export function useCourierGpsTracker({
  enabled,
  courierId,
}: {
  enabled: boolean;
  courierId: string | null | undefined;
}) {
  const watchIdRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    setState({ enabled: !!(enabled && courierId) });

    if (!enabled || !courierId) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastSavedRef.current = null;
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ permission: "unsupported", error: "הדפדפן לא תומך במיקום" });
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast.error("הדפדפן לא תומך במיקום (GPS)");
      }
      return;
    }

    // Try to read permission state (not on all browsers)
    if ((navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: "geolocation" })
        .then((p: any) => {
          setState({ permission: p.state as GpsLiveStatus["permission"] });
          p.onchange = () => setState({ permission: p.state as GpsLiveStatus["permission"] });
        })
        .catch(() => {});
    }

    const savePing = async (lat: number, lng: number, accuracy: number | null) => {
      try {
        await nestUpdateMyCourier({ last_lat: lat, last_lng: lng });
        setState({ error: null, lastSavedAt: Date.now() });
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "GPS save failed";
        console.warn("[gps] ping failed", message);
        setState({ error: message });
        return false;
      }
    };

    const onPos = async (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const now = Date.now();
      setState({ lat, lng, accuracy, lastFixAt: now, permission: "granted", error: null });
      const last = lastSavedRef.current;
      const movedEnough = !last || distMeters(last, { lat, lng }) >= MIN_MOVE_M;
      const dueToTime = !last || now - last.ts >= MAX_INTERVAL_MS;
      const tooSoon = last && now - last.ts < MIN_INTERVAL_MS;
      if (tooSoon) return;
      if (!movedEnough && !dueToTime) return;
      const ok = await savePing(lat, lng, accuracy);
      if (ok) lastSavedRef.current = { lat, lng, ts: now };
    };

    const onErr = (err: GeolocationPositionError) => {
      setState({ error: err.message });
      if (err.code === err.PERMISSION_DENIED) {
        setState({ permission: "denied" });
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast.error("הרשאת מיקום נדחתה - הבוט לא יוכל לשלוח לך הצעות לפי קרבה", { duration: 6000 });
        }
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 60_000,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, courierId]);
}
