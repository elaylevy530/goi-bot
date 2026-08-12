/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2, Layers, Plus, Minus, Crosshair,
  ChevronRight, ChevronLeft, Timer,
} from "lucide-react";

import { useMyCourier } from "@/components/CourierShell";
import { BusinessLogo } from "@/components/BusinessLogo";
import { termsFor } from "@/lib/courier-kind";

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

declare global {
  interface Window {
    google: typeof google;
    __initCourierJobsMap?: () => void;
  }
}

export type MapJob = {
  id: string;
  job_number?: string | number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_logo_path?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  job_type?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  delivery_deadline?: string | null;
  payment?: number | null;
  pricing_type?: string | null;
  requires_cash?: boolean | null;
  description?: string | null;
  vehicle_required?: string | null;
  package_size?: string | null;
  package_type?: string | null;
  number_of_packages?: number | null;
  item_category?: string | null;
  service_category?: string | null;
  dropoff_floor?: string | number | null;
  item_value?: string | number | null;
  __kind: "offer" | "open" | "quote";
  __raw: any;
};


/** Compact live countdown for accepting an offer.
 *  Uses `expiresAt` when set, otherwise a synthetic 10-minute window. */
const SYNTHETIC_ACCEPT_WINDOW_SEC = 10 * 60;
function AcceptTimerBox({ expiresAt }: { expiresAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const mountAtRef = useRef<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const effectiveDeadline = expiresAt
    ? new Date(expiresAt).getTime()
    : mountAtRef.current + SYNTHETIC_ACCEPT_WINDOW_SEC * 1000;
  const secLeft = Math.max(0, Math.floor((effectiveDeadline - now) / 1000));
  const mm = String(Math.floor(secLeft / 60));
  const ss = String(secLeft % 60).padStart(2, "0");
  const urgent = secLeft <= 60;
  const expired = secLeft === 0;
  return (
    <div
      className={`shrink-0 w-[4.5rem] min-h-11 grid place-items-center rounded-card border bg-surface ${
        expired
          ? "border-border text-text-muted"
          : urgent
            ? "border-destructive/40 text-destructive animate-pulse"
            : "border-border text-destructive"
      }`}
      aria-label="זמן לאישור המשלוח"
    >
      <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums">
        <Timer className="size-3.5 opacity-80" />
        {mm}:{ss}
      </span>
    </div>
  );
}

function shortLine(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  return raw.split(",")[0]?.trim() || raw;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function pinSvg(price: string, accent = "#35AD29") {
  const w = Math.max(58, 26 + price.length * 10);
  const h = 30;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w + 4}" height="${h + 12}" viewBox="0 0 ${w + 4} ${h + 12}">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0006"/>
    </filter>
  </defs>
  <g filter="url(#s)">
    <rect x="2" y="2" rx="9" ry="9" width="${w}" height="${h}" fill="#fff" stroke="${accent}" stroke-width="2"/>
    <polygon points="${(w + 4) / 2 - 6},${h + 1} ${(w + 4) / 2 + 6},${h + 1} ${(w + 4) / 2},${h + 10}" fill="${accent}"/>
    <text x="${(w + 4) / 2}" y="${h / 2 + 6}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="14" font-weight="800" fill="${accent}">${price}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pinSvgFilled(price: string, accent = "#35AD29") {
  const w = Math.max(60, 28 + price.length * 11);
  const h = 34;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w + 4}" height="${h + 14}" viewBox="0 0 ${w + 4} ${h + 14}">
  <defs>
    <filter id="s2" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0008"/>
    </filter>
  </defs>
  <g filter="url(#s2)">
    <rect x="2" y="2" rx="10" ry="10" width="${w}" height="${h}" fill="${accent}"/>
    <polygon points="${(w + 4) / 2 - 7},${h + 1} ${(w + 4) / 2 + 7},${h + 1} ${(w + 4) / 2},${h + 12}" fill="${accent}"/>
    <text x="${(w + 4) / 2}" y="${h / 2 + 7}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="16" font-weight="800" fill="#fff">${price}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type Props = {
  jobs: MapJob[];
  onClaim: (job: MapJob) => void;
  onDecline: (job: MapJob) => void;
  onQuote: (job: MapJob) => void;
  onDetails?: (job: MapJob) => void;
  claiming?: boolean;
};

export function CourierJobsMap({ jobs, onClaim, onDecline, onQuote, onDetails, claiming }: Props) {

  const { data: me } = useMyCourier();
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const dropMarkerRef = useRef<google.maps.Marker | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "now" | "schedule" | "quote">("all");

  useEffect(() => {
    if (!BROWSER_KEY) { setMapError("מפת Google לא מוגדרת"); return; }
    if (window.google?.maps) { setReady(true); return; }
    window.__initCourierJobsMap = () => setReady(true);
    if (document.querySelector("script[data-courier-jobs-map]")) return;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initCourierJobsMap${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.dataset.courierJobsMap = "1";
    s.onerror = () => setMapError("טעינת המפה נכשלה");
    document.head.appendChild(s);
  }, []);

  const myPos = useMemo(() => {
    if (me?.last_lat != null && me?.last_lng != null) {
      return { lat: Number(me.last_lat), lng: Number(me.last_lng) };
    }
    return null;
  }, [me?.last_lat, me?.last_lng]);

  // Create the map once. Do NOT depend on myPos — when GPS arrives later the old
  // effect cleanup disconnected ResizeObserver and never re-attached it, leaving
  // a blank/white map after the first layout shift (jobs carousel, etc.).
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const div = mapDivRef.current;
    mapRef.current = new window.google.maps.Map(div, {
      center: DEFAULT_CENTER,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    });

    const invalidate = () => {
      const map = mapRef.current;
      if (!map || !div) return;
      if (div.clientWidth < 2 || div.clientHeight < 2) return;
      window.google.maps.event.trigger(map, "resize");
      // Re-apply center after resize so vector/raster tiles repaint (Maps JS quirk).
      const c = map.getCenter();
      if (c) map.setCenter(c);
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(invalidate);
    });
    ro.observe(div);
    requestAnimationFrame(invalidate);
    const t1 = window.setTimeout(invalidate, 120);
    const t2 = window.setTimeout(invalidate, 450);

    return () => {
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ready]);

  // After jobs land (carousel / layout shift), force a map repaint.
  useEffect(() => {
    const map = mapRef.current;
    const div = mapDivRef.current;
    if (!ready || !map || !div) return;
    const invalidate = () => {
      if (div.clientWidth < 2 || div.clientHeight < 2) return;
      window.google.maps.event.trigger(map, "resize");
      const c = map.getCenter();
      if (c) map.setCenter(c);
    };
    const id = window.requestAnimationFrame(() => {
      invalidate();
      window.setTimeout(invalidate, 80);
    });
    return () => window.cancelAnimationFrame(id);
  }, [ready, jobs.length]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filter === "now") return !j.job_date;
      if (filter === "schedule") return !!j.job_date;
      if (filter === "quote") return j.__kind === "quote";
      return true;
    });
  }, [jobs, filter]);

  // Smart ranking: lower score = better. Weighs distance-to-pickup, payment, urgency.
  const scoredJobs = useMemo(() => {
    return visibleJobs
      .map((j) => {
        const hasPickup = j.pickup_lat != null && j.pickup_lng != null;
        const pickup = hasPickup
          ? { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) }
          : null;
        const fromJobKm = Number(
          (j as { estimated_distance_km?: unknown; distance_km?: unknown }).estimated_distance_km
            ?? (j as { distance_km?: unknown }).distance_km
            ?? NaN,
        );
        const distToPickup =
          myPos && pickup
            ? haversineKm(myPos, pickup)
            : Number.isFinite(fromJobKm)
              ? fromJobKm
              : null;
        const pay = Number(j.payment ?? 0);
        const isImmediate = !j.job_date;
        const score =
          (distToPickup ?? 8) * 10 -
          (pay > 0 ? pay / 3 : 0) +
          (isImmediate ? -5 : 0) +
          (j.__kind === "quote" ? 3 : 0) +
          (hasPickup ? 0 : 4);
        return { job: j, score, distToPickup };
      })
      .sort((a, b) => a.score - b.score);
  }, [visibleJobs, myPos]);

  // Auto-select best-scored job if none selected
  useEffect(() => {
    if (activeId && scoredJobs.some((s) => s.job.id === activeId)) return;
    if (scoredJobs.length === 0) { setActiveId(null); return; }
    setActiveId(scoredJobs[0].job.id);
  }, [scoredJobs, activeId]);

  const active = useMemo(() => visibleJobs.find(j => j.id === activeId) ?? null, [visibleJobs, activeId]);

  const activeIdx = useMemo(
    () => scoredJobs.findIndex((s) => s.job.id === activeId),
    [scoredJobs, activeId],
  );
  const goToIdx = (idx: number) => {
    if (scoredJobs.length === 0) return;
    const wrapped = ((idx % scoredJobs.length) + scoredJobs.length) % scoredJobs.length;
    const j = scoredJobs[wrapped].job;
    setActiveId(j.id);
    if (mapRef.current && j.pickup_lat != null && j.pickup_lng != null) {
      mapRef.current.panTo({ lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) });
    }
    const el = carouselRef.current;
    if (el) {
      const w = el.clientWidth;
      // RTL: scrollLeft is negative in most browsers; use signed target
      const sign = getComputedStyle(el).direction === "rtl" ? -1 : 1;
      el.scrollTo({ left: sign * wrapped * w, behavior: "smooth" });
    }
  };


  // Pan when GPS arrives — without rebuilding the map (see init effect above).
  useEffect(() => {
    if (!mapRef.current || !myPos || activeId) return;
    mapRef.current.panTo(myPos);
  }, [myPos, activeId]);

  // Keep the map focused on the selected offer's pickup.
  useEffect(() => {
    if (!mapRef.current || !active) return;
    if (active.pickup_lat == null || active.pickup_lng == null) return;
    mapRef.current.panTo({
      lat: Number(active.pickup_lat),
      lng: Number(active.pickup_lng),
    });
  }, [active?.id]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (meMarkerRef.current) { meMarkerRef.current.setMap(null); meMarkerRef.current = null; }
    if (!myPos) return;
    meMarkerRef.current = new window.google.maps.Marker({
      position: myPos,
      map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
      zIndex: 999,
    });
  }, [myPos, ready]);

  // markers — incremental diff so existing pins don't flicker/rebuild on every refetch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    const existing = markersRef.current;
    const nextIds = new Set(visibleJobs.map((j) => j.id));

    // Remove markers no longer visible
    for (const [id, m] of existing) {
      if (!nextIds.has(id)) {
        m.setMap(null);
        existing.delete(id);
      }
    }

    const bounds = new window.google.maps.LatLngBounds();
    if (myPos) bounds.extend(myPos);

    for (const j of visibleJobs) {
      if (j.pickup_lat == null || j.pickup_lng == null) continue;
      const pos = { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) };
      const priceLabel = j.__kind === "quote" ? "₪?" : `₪${Number(j.payment ?? 0).toFixed(0)}`;
      const accent = j.__kind === "quote" ? "#f59e0b" : "#35AD29";
      const isActive = j.id === activeId;
      const url = isActive ? pinSvgFilled(priceLabel, accent) : pinSvg(priceLabel, accent);
      const w = Math.max(60, 28 + priceLabel.length * 11) + 4;
      const icon = {
        url,
        scaledSize: new window.google.maps.Size(w, isActive ? 48 : 42),
        anchor: new window.google.maps.Point(w / 2, isActive ? 48 : 42),
      };

      let marker = existing.get(j.id);
      if (marker) {
        // Update in place — no teardown, no flicker
        const cur = marker.getPosition();
        if (!cur || cur.lat() !== pos.lat || cur.lng() !== pos.lng) {
          marker.setPosition(pos);
        }
        marker.setIcon(icon);
        marker.setZIndex(isActive ? 800 : 500);
      } else {
        marker = new window.google.maps.Marker({
          position: pos,
          map,
          icon,
          zIndex: isActive ? 800 : 500,
          title: j.customer_name ?? "עבודה",
        });
        marker.addListener("click", () => {
          setActiveId(j.id);
          map.panTo(pos);
        });
        existing.set(j.id, marker);
      }
      bounds.extend(pos);
    }

    if (!activeId) {
      // Always keep the courier centered on their real GPS position so the
      // map never misleads them into thinking they are at a job's pickup city.
      if (myPos) {
        map.setCenter(myPos);
        if ((map.getZoom() ?? 0) < 12) map.setZoom(13);
      } else if (visibleJobs.length > 1) {
        map.fitBounds(bounds, 80);
      }
    }
  }, [visibleJobs, myPos, activeId]);


  // route preview to active pickup + dropoff marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    if (polyRef.current) { polyRef.current.setMap(null); polyRef.current = null; }
    if (dropMarkerRef.current) { dropMarkerRef.current.setMap(null); dropMarkerRef.current = null; }
    if (!active) return;
    const pickup = active.pickup_lat != null && active.pickup_lng != null
      ? { lat: Number(active.pickup_lat), lng: Number(active.pickup_lng) } : null;
    const drop = active.dropoff_lat != null && active.dropoff_lng != null
      ? { lat: Number(active.dropoff_lat), lng: Number(active.dropoff_lng) } : null;

    if (myPos && pickup) {
      polyRef.current = new window.google.maps.Polyline({
        path: [myPos, pickup],
        strokeColor: "#2563eb",
        strokeOpacity: 0,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }],
        map,
      });
    }
    if (drop) {
      dropMarkerRef.current = new window.google.maps.Marker({
        position: drop, map,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#35AD29",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 700,
      });
    }
  }, [active, myPos]);

  const zoomBy = (delta: number) => {
    const m = mapRef.current; if (!m) return;
    m.setZoom((m.getZoom() ?? 13) + delta);
  };
  const cycleMapType = () => {
    const m = mapRef.current; if (!m) return;
    const cur = m.getMapTypeId();
    m.setMapTypeId(cur === "roadmap" ? "hybrid" : "roadmap");
  };

  return (
    // Mobile: fills the full-bleed shell viewport minus the bottom tab bar. Desktop: card.
    <div className="flex-1 min-h-0 h-full sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm sm:overflow-hidden flex flex-col">
      {/* Map area — definite min-height on mobile so flex layout can't collapse tiles to white */}
      <div className="relative flex-1 min-h-[50dvh] sm:min-h-[420px]">

        {mapError ? (
          <div className="h-full flex items-center justify-center text-slate-500 bg-slate-50 text-sm">
            {mapError}
          </div>
        ) : (
          <div
            ref={mapDivRef}
            className="absolute inset-0 w-full h-full bg-slate-100"
          />
        )}

        {/* Floating map controls — below header overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          <button onClick={cycleMapType} className="size-10 rounded-card bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95" aria-label="שכבות">
            <Layers className="size-4" />
          </button>
          {myPos && (
            <button
              onClick={() => { mapRef.current?.panTo(myPos); mapRef.current?.setZoom(14); }}
              className="size-10 rounded-card bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95"
              aria-label="מרכז עליי"
            >
              <Crosshair className="size-4" />
            </button>
          )}
          <div className="rounded-card bg-surface shadow-card border border-border overflow-hidden flex flex-col">
            <button onClick={() => zoomBy(1)} className="size-10 flex items-center justify-center text-text-strong active:scale-95 border-b border-border" aria-label="הגדל">
              <Plus className="size-4" />
            </button>
            <button onClick={() => zoomBy(-1)} className="size-10 flex items-center justify-center text-text-strong active:scale-95" aria-label="הקטן">
              <Minus className="size-4" />
            </button>
          </div>
        </div>

        {/* Compact offer carousel — map stays dominant */}
        {scoredJobs.length > 0 && active && (() => {
          const renderCard = (j: MapJob, distToPickupKm: number | null) => {
            const businessName = j.customer_name?.trim() || "לקוח פרטי";
            const jIsQuote = j.__kind === "quote";
            const jIsMove = j.service_category === "small_move" || j.service_category === "big_move" || t.kind === "mover";
            const kindLabel = jIsMove ? "הובלה" : (j.job_type?.trim() || "משלוח מהיר");
            const distLabel =
              distToPickupKm != null && Number.isFinite(distToPickupKm)
                ? `${distToPickupKm < 10 ? distToPickupKm.toFixed(1) : Math.round(distToPickupKm)} ק״מ`
                : null;
            const pickupLine = shortLine(j.pickup_address ?? j.pickup_area);
            const dropoffLine = shortLine(j.dropoff_address ?? j.dropoff_area);
            const offerExpiresAt =
              (j.__raw?.offer?.expires_at as string | undefined)
              ?? (j.__raw?.expires_at as string | undefined)
              ?? (j.__raw?.job?.quote_deadline_at as string | undefined)
              ?? (j.__raw?.quote_deadline_at as string | undefined)
              ?? null;

            return (
              <div
                key={j.id}
                data-job-id={j.id}
                dir="rtl"
                className="snap-center shrink-0 w-full rounded-card border border-border bg-surface shadow-card-strong p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="shrink-0 text-left min-w-[4.25rem]">
                    {jIsQuote ? (
                      <p className="text-xl font-extrabold text-warning tabular-nums leading-none">₪?</p>
                    ) : (
                      <p className="text-xl font-extrabold text-primary tabular-nums leading-none">
                        ₪{Number(j.payment ?? 0).toFixed(0)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="min-w-0 text-right">
                      <h3 className="font-bold text-text-strong text-[15px] leading-tight truncate">{businessName}</h3>
                      <p className="text-[11px] text-text-subtle mt-0.5 truncate">
                        {[distLabel, kindLabel].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <BusinessLogo path={j.customer_logo_path} name={businessName} size={36} />
                  </div>
                </div>

                <div className="border-t border-border" />

                <div className="space-y-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <p className="flex-1 text-[13px] text-text-strong truncate">
                      איסוף: {pickupLine}
                    </p>
                    <span className="size-2 rounded-full bg-primary shrink-0" aria-hidden />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <p className="flex-1 text-[13px] text-text-subtle truncate">
                      מסירה: {dropoffLine}
                    </p>
                    <span className="size-2 rounded-full bg-destructive shrink-0" aria-hidden />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!jIsQuote && <AcceptTimerBox expiresAt={offerExpiresAt} />}
                  {jIsQuote ? (
                    <Button
                      className="flex-1 min-h-11 rounded-card bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-fab"
                      onClick={() => onQuote(j)}
                    >
                      הגש הצעת מחיר
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 min-h-11 rounded-card bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-fab"
                      disabled={claiming}
                      onClick={() => onClaim(j)}
                    >
                      {claiming && <Loader2 className="size-4 animate-spin" />}
                      {jIsMove ? "קבל הובלה" : "קבל משלוח"}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 pt-0.5">
                  {onDetails && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-text-muted hover:text-text-strong py-1"
                      onClick={() => onDetails(j)}
                    >
                      פרטים
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs font-semibold text-destructive/80 hover:text-destructive py-1"
                    onClick={() => onDecline(j)}
                    aria-label="דלג"
                  >
                    דלג
                  </button>
                </div>
              </div>
            );
          };

          const hasMultiple = scoredJobs.length >= 2;

          return (
            <div className="absolute inset-x-3 bottom-3 z-10 pointer-events-none">
              {hasMultiple && (
                <div dir="rtl" className="pointer-events-auto flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => goToIdx(activeIdx - 1)}
                    className="size-8 rounded-full bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95"
                    aria-label="הצעה קודמת"
                  >
                    <ChevronRight className="size-4" />
                  </button>

                  <div className="flex items-center gap-2 bg-surface/95 border border-border shadow-card rounded-pill px-2.5 py-1">
                    <span className="text-[11px] font-extrabold text-text-strong">
                      {activeIdx + 1} / {scoredJobs.length}
                    </span>
                    <div className="flex gap-1">
                      {scoredJobs.map((s, i) => (
                        <button
                          key={s.job.id}
                          onClick={() => goToIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === activeIdx ? "w-5 bg-primary" : "w-1.5 bg-border-strong"
                          }`}
                          aria-label={`הצעה ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => goToIdx(activeIdx + 1)}
                    className="size-8 rounded-full bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95"
                    aria-label="הצעה הבאה"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              )}

              <div
                dir="rtl"
                ref={carouselRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const w = el.clientWidth;
                  if (w <= 0) return;
                  const idx = Math.round(Math.abs(el.scrollLeft) / w);
                  const clamped = Math.max(0, Math.min(scoredJobs.length - 1, idx));
                  const target = scoredJobs[clamped]?.job.id;
                  if (target && target !== activeId) setActiveId(target);
                }}
                className="pointer-events-auto flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: "none" }}
              >
                {scoredJobs.map((s) => renderCard(s.job, s.distToPickup))}
              </div>
            </div>
          );
        })()}

        {scoredJobs.length === 0 && (
          <div
            dir="rtl"
            className="absolute inset-x-3 bottom-3 z-10 rounded-card bg-surface/95 backdrop-blur-md border border-border shadow-card px-5 py-5 text-center"
          >
            <div className="text-sm font-bold text-text-strong">
              {t.kind === "mover" ? "אין כרגע הובלות באזורכם" : "אין כרגע משלוחים באזורכם"}
            </div>
            <div className="text-xs text-text-subtle mt-1 leading-snug">
              משכו למטה לרענון, או נסעו לאזור עמוס יותר.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
