/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Layers, Plus, Minus, Crosshair,
  ChevronRight, ChevronLeft,
} from "lucide-react";

import { useMyCourier } from "@/components/CourierShell";
import { CourierOfferCard } from "@/components/courier/CourierOfferCard";
import { termsFor } from "@/lib/courier-kind";
import {
  COURIER_MAP_STYLES_DARK,
  COURIER_MAP_STYLES_LIGHT,
  readCourierTheme,
  useCourierTheme,
} from "@/lib/courier-theme";
import { fetchDrivingRoute, haversineKm, type DrivingRoute, type LatLng } from "@/lib/google-driving-route";
import { pickupReadyMapLabel } from "@/lib/pickup-ready";

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };
const MAP_FIT_PAD = { top: 180, right: 48, bottom: 260, left: 56 } as const;

function tokenColor(el: HTMLElement | null, name: string, fallback: string) {
  if (!el) return fallback;
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

declare global {
  interface Window {
    google: typeof google;
    __initCourierJobsMap?: () => void;
  }
}

export type MapJob = {
  id: string;
  job_number?: string | number | null;
  order_number?: string | number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_logo_path?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  pickup_notes?: string | null;
  pickup_instructions?: string | null;
  pickup_ready?: boolean | null;
  pickup_ready_at?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  dropoff_notes?: string | null;
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
  matching_couriers_count?: number | null;
  pricing_snapshot?: Record<string, unknown> | null;
  __kind: "offer" | "open" | "quote";
  __raw: any;
};


function stopPinSvg(kind: "store" | "home", fill: string, onFill = "#fff") {
  const glyph =
    kind === "store"
      ? `<path d="M10 14.2h16v1.6H10zm1.2 1.6h13.6V22H11.2zm2 0V22m4.8-6.2V22m4.8-6.2V22" fill="none" stroke="${onFill}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M10 14.2l1.3-3.4h13.4L26 14.2" fill="none" stroke="${onFill}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M11 18.5V23h5.2v-3.2h3.6V23H25v-4.5" fill="none" stroke="${onFill}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M10 18.8L18 12l8 6.8" fill="none" stroke="${onFill}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <defs>
    <filter id="sp" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0006"/>
    </filter>
  </defs>
  <g filter="url(#sp)">
    <circle cx="18" cy="16" r="14" fill="${fill}" stroke="${onFill}" stroke-width="3"/>
    <polygon points="12,28 24,28 18,40" fill="${fill}"/>
    ${glyph}
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function readyCalloutSvg(label: string) {
  const safe = label.replace(/[<>&]/g, "");
  const w = Math.max(178, 36 + safe.length * 7.4);
  const h = 34;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 8}" viewBox="0 0 ${w} ${h + 8}">
  <defs>
    <filter id="rc" x="-20%" y="-30%" width="140%" height="170%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#0004"/>
    </filter>
  </defs>
  <g filter="url(#rc)">
    <rect x="1" y="1" rx="12" ry="12" width="${w - 2}" height="${h}" fill="#fff" stroke="#E6E6E6" stroke-width="1"/>
    <circle cx="${w - 18}" cy="${h / 2 + 1}" r="8" fill="#E8F8E6"/>
    <circle cx="${w - 18}" cy="${h / 2 + 1}" r="5.2" fill="none" stroke="#35AD29" stroke-width="1.6"/>
    <path d="M${w - 18} ${h / 2 - 1.2}v3.2l2.2 1.2" fill="none" stroke="#35AD29" stroke-width="1.5" stroke-linecap="round"/>
    <text x="${w - 32}" y="${h / 2 + 5}" text-anchor="end" font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="12" font-weight="700" fill="#1A1A1A">${safe}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

type Props = {
  jobs: MapJob[];
  onClaim: (job: MapJob) => void;
  onDecline: (job: MapJob) => void;
  onQuote: (job: MapJob) => void;
  onDetails?: (job: MapJob) => void;
  claiming?: boolean;
  /** Extra classes for the floating zoom/layers cluster (e.g. to clear an overlay). */
  controlsClassName?: string;
  leftExtra?: ReactNode;
  /** Rendered under the zoom +/− cluster (same left column). */
  belowControls?: ReactNode;
  rightExtra?: ReactNode;
  emptyState?: ReactNode;
  onActiveChange?: (job: MapJob | null) => void;
};

export function CourierJobsMap({ jobs, onClaim, onDecline, onQuote, onDetails, claiming, controlsClassName, leftExtra, belowControls, rightExtra, emptyState, onActiveChange }: Props) {

  const { data: me } = useMyCourier();
  const t = termsFor((me as { courier_kind?: "courier" | "mover" } | null | undefined)?.courier_kind);
  const { dark } = useCourierTheme();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const casingRef = useRef<google.maps.Polyline | null>(null);
  const pickupStopRef = useRef<google.maps.Marker | null>(null);
  const readyCalloutRef = useRef<google.maps.Marker | null>(null);
  const dropMarkerRef = useRef<google.maps.Marker | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<DrivingRoute | null>(null);
  const [filter, setFilter] = useState<"all" | "now" | "schedule" | "quote">("all");
  const [readyTick, setReadyTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setReadyTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

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
    const initialDark = readCourierTheme() === "dark";
    mapRef.current = new window.google.maps.Map(div, {
      center: DEFAULT_CENTER,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
      backgroundColor: initialDark ? "#121212" : "#f1f5f9",
      styles: [...(initialDark ? COURIER_MAP_STYLES_DARK : COURIER_MAP_STYLES_LIGHT)] as google.maps.MapTypeStyle[],
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

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setOptions({
      backgroundColor: dark ? "#121212" : "#f1f5f9",
      styles: [...(dark ? COURIER_MAP_STYLES_DARK : COURIER_MAP_STYLES_LIGHT)] as google.maps.MapTypeStyle[],
    });
  }, [dark, ready]);

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

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

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

    const accentDefault = tokenColor(mapDivRef.current, "--brand-green", "#35AD29");
    const quoteAccent = tokenColor(mapDivRef.current, "--warning", "#e88026");

    for (const j of visibleJobs) {
      if (j.pickup_lat == null || j.pickup_lng == null) continue;
      const pos = { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) };
      bounds.extend(pos);

      let marker = existing.get(j.id);
      if (j.id === activeId) {
        if (marker) {
          marker.setMap(null);
          existing.delete(j.id);
        }
        continue;
      }

      const priceLabel = j.__kind === "quote" ? "₪?" : `₪${Number(j.payment ?? 0).toFixed(0)}`;
      const accent = j.__kind === "quote" ? quoteAccent : accentDefault;
      const url = pinSvg(priceLabel, accent);
      const w = Math.max(60, 28 + priceLabel.length * 11) + 4;
      const icon = {
        url,
        scaledSize: new window.google.maps.Size(w, 42),
        anchor: new window.google.maps.Point(w / 2, 42),
      };

      if (marker) {
        const cur = marker.getPosition();
        if (!cur || cur.lat() !== pos.lat || cur.lng() !== pos.lng) {
          marker.setPosition(pos);
        }
        marker.setIcon(icon);
        marker.setZIndex(500);
      } else {
        marker = new window.google.maps.Marker({
          position: pos,
          map,
          icon,
          zIndex: 500,
          title: j.customer_name ?? "עבודה",
        });
        marker.addListener("click", () => {
          setActiveId(j.id);
        });
        existing.set(j.id, marker);
      }
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


  // Driving route for the selected offer: me → pickup → dropoff.
  useEffect(() => {
    const map = mapRef.current;
    const el = mapDivRef.current;
    if (!map || !window.google) return;

    const clearRoute = () => {
      polyRef.current?.setMap(null);
      polyRef.current = null;
      casingRef.current?.setMap(null);
      casingRef.current = null;
      pickupStopRef.current?.setMap(null);
      pickupStopRef.current = null;
      readyCalloutRef.current?.setMap(null);
      readyCalloutRef.current = null;
      dropMarkerRef.current?.setMap(null);
      dropMarkerRef.current = null;
    };

    clearRoute();
    setActiveRoute(null);
    if (!active) return;

    const pickup: LatLng | null =
      active.pickup_lat != null && active.pickup_lng != null
        ? { lat: Number(active.pickup_lat), lng: Number(active.pickup_lng) }
        : null;
    const drop: LatLng | null =
      active.dropoff_lat != null && active.dropoff_lng != null
        ? { lat: Number(active.dropoff_lat), lng: Number(active.dropoff_lng) }
        : null;

    const green = tokenColor(el, "--brand-green", tokenColor(el, "--primary", "#35AD29"));
    const navy = tokenColor(el, "--navy", "#101418");
    const orange = "#E86B3A";
    const onFill = tokenColor(el, "--primary-foreground", "#fff");

    const stopIcon = (kind: "store" | "home", fill: string) => ({
      url: stopPinSvg(kind, fill, onFill),
      scaledSize: new window.google.maps.Size(36, 44),
      anchor: new window.google.maps.Point(18, 40),
    });

    if (pickup) {
      pickupStopRef.current = new window.google.maps.Marker({
        position: pickup,
        map,
        icon: stopIcon("store", green),
        title: "בית העסק",
        zIndex: 850,
      });

      const readyLabel = pickupReadyMapLabel(active);
      if (readyLabel) {
        const bubbleW = Math.max(178, 36 + readyLabel.length * 7.4);
        readyCalloutRef.current = new window.google.maps.Marker({
          position: pickup,
          map,
          icon: {
            url: readyCalloutSvg(readyLabel),
            scaledSize: new window.google.maps.Size(bubbleW, 42),
            anchor: new window.google.maps.Point(bubbleW / 2, 52),
          },
          title: readyLabel,
          zIndex: 860,
          clickable: false,
        });
      }
    }
    if (drop) {
      dropMarkerRef.current = new window.google.maps.Marker({
        position: drop,
        map,
        icon: stopIcon("home", orange),
        title: "הלקוח",
        zIndex: 850,
      });
    }

    const fit = (points: LatLng[]) => {
      if (points.length === 0) return;
      if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(14);
        return;
      }
      const bounds = new window.google.maps.LatLngBounds();
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, MAP_FIT_PAD);
    };

    const drawRoute = (path: LatLng[], dashed: boolean) => {
      casingRef.current?.setMap(null);
      polyRef.current?.setMap(null);
      casingRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: navy,
        strokeOpacity: dashed ? 0 : 0.85,
        strokeWeight: dashed ? 0 : 10,
        map,
        zIndex: 4,
      });
      polyRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: green,
        strokeOpacity: dashed ? 0 : 1,
        strokeWeight: dashed ? 0 : 6,
        icons: dashed
          ? [{
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3, strokeColor: green },
              offset: "0",
              repeat: "12px",
            }]
          : undefined,
        map,
        zIndex: 5,
      });
    };

    const origin = myPos ?? pickup;
    if (!origin || !drop) {
      if (pickup) fit(myPos ? [myPos, pickup] : [pickup]);
      return;
    }

    const preview = myPos && pickup ? [myPos, pickup, drop] : [origin, drop];
    drawRoute(preview, true);
    fit(preview);

    let cancelled = false;
    const waypoints = myPos && pickup ? [pickup] : [];
    void fetchDrivingRoute(origin, drop, waypoints).then((route) => {
      if (cancelled) return;
      if (!route?.path.length) {
        const km = Math.round(haversineKm(origin, drop) * 10) / 10;
        setActiveRoute({
          path: preview,
          distanceKm: km,
          durationMin: Math.max(1, Math.round(km * 3)),
        });
        return;
      }
      drawRoute(route.path, false);
      fit(route.path);
      setActiveRoute(route);
    });

    return () => {
      cancelled = true;
      clearRoute();
    };
  }, [
    ready,
    active?.id,
    active?.pickup_lat,
    active?.pickup_lng,
    active?.dropoff_lat,
    active?.dropoff_lng,
    active?.pickup_ready,
    active?.pickup_ready_at,
    myPos?.lat,
    myPos?.lng,
  ]);

  // Refresh only the ready-countdown callout without redrawing the route.
  useEffect(() => {
    const marker = readyCalloutRef.current;
    const job = active;
    if (!marker || !job || !window.google) return;
    const label = pickupReadyMapLabel(job, readyTick);
    if (!label) {
      marker.setMap(null);
      readyCalloutRef.current = null;
      return;
    }
    const bubbleW = Math.max(178, 36 + label.length * 7.4);
    marker.setIcon({
      url: readyCalloutSvg(label),
      scaledSize: new window.google.maps.Size(bubbleW, 42),
      anchor: new window.google.maps.Point(bubbleW / 2, 52),
    });
    marker.setTitle(label);
  }, [readyTick, active?.id, active?.pickup_ready, active?.pickup_ready_at]);

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
            className="absolute inset-0 w-full h-full bg-map-canvas"
          />
        )}

        {/* Floating map controls — sit below the page overlay when one is present */}
        <div className={`absolute left-3 flex flex-col gap-2 z-10 ${controlsClassName ?? "top-3"}`}>
          {leftExtra}
          <button onClick={cycleMapType} className="size-10 rounded-full bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95" aria-label="שכבות">
            <Layers className="size-4" />
          </button>
          {myPos && (
            <button
              onClick={() => { mapRef.current?.panTo(myPos); mapRef.current?.setZoom(14); }}
              className="size-10 rounded-full bg-surface shadow-card border border-border flex items-center justify-center text-text-strong active:scale-95"
              aria-label="מרכז עליי"
            >
              <Crosshair className="size-4" />
            </button>
          )}
          <div className="rounded-full bg-surface shadow-card border border-border overflow-hidden flex flex-col">
            <button onClick={() => zoomBy(1)} className="size-10 flex items-center justify-center text-text-strong active:scale-95 border-b border-border" aria-label="הגדל">
              <Plus className="size-4" />
            </button>
            <button onClick={() => zoomBy(-1)} className="size-10 flex items-center justify-center text-text-strong active:scale-95" aria-label="הקטן">
              <Minus className="size-4" />
            </button>
          </div>
          {belowControls}
        </div>

        {rightExtra && (
          <div className={`absolute right-3 z-10 flex flex-col gap-3 ${controlsClassName ?? "top-3"}`}>
            {rightExtra}
          </div>
        )}

        {/* Compact offer carousel — map stays dominant */}
        {scoredJobs.length > 0 && active && (() => {
          const renderCard = (j: MapJob, distToPickupKm: number | null) => (
            <CourierOfferCard
              key={j.id}
              job={j}
              distToPickupKm={distToPickupKm}
              route={j.id === activeId ? activeRoute : null}
              claiming={claiming}
              terms={t}
              onClaim={onClaim}
              onDecline={onDecline}
              onQuote={onQuote}
              onDetails={onDetails}
            />
          );

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
          emptyState ?? (
            <div
              dir="rtl"
              className="absolute inset-x-3 bottom-3 z-10 rounded-card bg-surface/95 backdrop-blur-md border border-border shadow-card px-5 py-5 text-center"
            >
              <div className="text-sm font-bold text-text-strong">
                אין כרגע משלוחים באזורכם
              </div>
              <div className="text-xs text-text-subtle mt-1 leading-snug">
                משכו למטה לרענון, או נסעו לאזור עמוס יותר.
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
