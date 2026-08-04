/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MapPin, Clock, Loader2, Info, HandCoins, Layers, Plus, Minus, Crosshair, Package, Route as RouteIcon,
  ChevronRight, ChevronLeft, ChevronsRight, List, X, Store, ChevronsLeft, Coins, Navigation2, Timer, AlarmClock,
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


/** Compact live countdown chip for accepting an offer.
 *  Uses `expiresAt` when set, otherwise a synthetic 10-minute window. */
const SYNTHETIC_ACCEPT_WINDOW_SEC = 10 * 60;
function AcceptTimerChip({ expiresAt }: { expiresAt?: string | null }) {
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
  const mm = String(Math.floor(secLeft / 60)).padStart(2, "0");
  const ss = String(secLeft % 60).padStart(2, "0");
  const urgent = secLeft <= 60;
  const expired = secLeft === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-black tabular-nums ring-1 ${
        expired
          ? "bg-slate-200 text-slate-600 ring-slate-300"
          : urgent
          ? "bg-rose-600 text-white ring-rose-700 animate-pulse"
          : "bg-rose-50 text-rose-700 ring-rose-300"
      }`}
      aria-label="זמן לאישור המשלוח"
    >
      <Timer className="size-2.5" />
      {mm}:{ss}
    </span>
  );
}

/** Small rotating "social pressure" pill — mimics other couriers seeing the offer.
 *  Purely presentational to nudge acceptance. */
const PRESSURE_MESSAGES = [
  { icon: "👀", text: "שליח נוסף צופה עכשיו" },
  { icon: "⚡", text: "2 שליחים ראו את ההצעה" },
  { icon: "🔥", text: "הצעה מבוקשת באזור" },
  { icon: "🏁", text: "שליח קרוב שוקל לקחת" },
  { icon: "💰", text: "תשלום מיידי עם סיום" },
];
function PressurePill({ jobId }: { jobId: string }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // reset on job change
    setIdx(Math.floor(Math.random() * PRESSURE_MESSAGES.length));
    setVisible(true);
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1 + Math.floor(Math.random() * (PRESSURE_MESSAGES.length - 1))) % PRESSURE_MESSAGES.length);
        setVisible(true);
      }, 260);
    }, 4500);
    return () => clearInterval(t);
  }, [jobId]);
  const m = PRESSURE_MESSAGES[idx];
  return (
    <div
      dir="rtl"
      className={`pointer-events-none flex justify-center mb-1.5 transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-slate-900/90 text-white text-[11px] font-bold shadow-lg backdrop-blur ring-1 ring-white/10">
        <span aria-hidden>{m.icon}</span>
        <span>{m.text}</span>
      </div>
    </div>
  );
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

function deliveryKindLabel(job: Pick<MapJob, "job_type" | "package_type" | "item_category" | "number_of_packages">) {
  const qty = Number(job.number_of_packages ?? 0);
  const baseType = job.job_type ?? "משלוח";
  const category = job.item_category ?? job.package_type ?? null;
  const label = qty > 0 ? `${qty} × ${baseType}` : baseType;
  return category && category !== baseType ? `${label} · ${category}` : label;
}

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

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: myPos ?? DEFAULT_CENTER,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    });
    const div = mapDivRef.current;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) window.google.maps.event.trigger(mapRef.current, "resize");
    });
    ro.observe(div);
    return () => ro.disconnect();
  }, [ready, myPos]);

  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.pickup_lat == null || j.pickup_lng == null) return false;
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
        const pickup = { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) };
        const distToPickup = myPos ? haversineKm(myPos, pickup) : 5;
        const pay = Number(j.payment ?? 0);
        const isImmediate = !j.job_date;
        // Score: distance is primary (×10), payment subtracts (₪/3), immediate gets -5 bonus, quote +3 penalty.
        const score =
          distToPickup * 10 -
          (pay > 0 ? pay / 3 : 0) +
          (isImmediate ? -5 : 0) +
          (j.__kind === "quote" ? 3 : 0);
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

  const [showList, setShowList] = useState(false);

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

  const distanceKm = active
    && active.pickup_lat != null && active.pickup_lng != null
    && active.dropoff_lat != null && active.dropoff_lng != null
    ? haversineKm(
        { lat: Number(active.pickup_lat), lng: Number(active.pickup_lng) },
        { lat: Number(active.dropoff_lat), lng: Number(active.dropoff_lng) },
      )
    : null;

  const FilterChip = ({ id, label, icon: Icon }: { id: typeof filter; label: string; icon?: any }) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`h-9 rounded-full text-[12px] font-bold flex items-center justify-center gap-1 transition px-1 ${
        filter === id
          ? "bg-[#35AD29] text-white shadow-md"
          : "bg-white border border-slate-200 text-slate-700 shadow-sm"
      }`}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );

  const zoomBy = (delta: number) => {
    const m = mapRef.current; if (!m) return;
    m.setZoom((m.getZoom() ?? 13) + delta);
  };
  const cycleMapType = () => {
    const m = mapRef.current; if (!m) return;
    const cur = m.getMapTypeId();
    m.setMapTypeId(cur === "roadmap" ? "hybrid" : "roadmap");
  };

  const isQuote = active?.__kind === "quote";

  return (
    // Mobile: fills the full-bleed shell viewport minus the bottom tab bar. Desktop: card.
    <div className="flex-1 min-h-0 sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm sm:overflow-hidden flex flex-col">
      {/* Map area — fills all available height */}
      <div className="relative flex-1 min-h-0 sm:min-h-[420px]">

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

        {/* Floating right rail */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button onClick={cycleMapType} className="size-10 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-700 active:scale-95" aria-label="שכבות">
            <Layers className="size-4" />
          </button>
          {myPos && (
            <button
              onClick={() => { mapRef.current?.panTo(myPos); mapRef.current?.setZoom(14); }}
              className="size-10 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-700 active:scale-95"
              aria-label="מרכז עליי"
            >
              <Crosshair className="size-4" />
            </button>
          )}
          <div className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col">
            <button onClick={() => zoomBy(1)} className="size-10 flex items-center justify-center text-slate-700 active:scale-95 border-b border-slate-100" aria-label="הגדל">
              <Plus className="size-4" />
            </button>
            <button onClick={() => zoomBy(-1)} className="size-10 flex items-center justify-center text-slate-700 active:scale-95" aria-label="הקטן">
              <Minus className="size-4" />
            </button>
          </div>
        </div>

        {/* Floating Gett-style offer carousel — swipeable, with visible arrows */}
        {scoredJobs.length > 0 && active && (() => {
          const renderCard = (j: MapJob) => {
            const businessName = j.customer_name?.trim() || "לקוח פרטי";
            const pickupAddr = [j.pickup_address, j.pickup_area].filter(Boolean).join(", ") || "כתובת איסוף";
            const dropoffAddr = [j.dropoff_address, j.dropoff_area].filter(Boolean).join(", ") || "כתובת מסירה";
            const pickupTime = j.job_time || (j.job_date ? j.job_date : "מיידי");
            const packages = Number(j.number_of_packages ?? 0);
            const jIsQuote = j.__kind === "quote";
            const jIsMove = j.service_category === "small_move" || j.service_category === "big_move" || t.kind === "mover";
            const jobWord = jIsMove ? "הובלה" : "משלוח";
            // Distance is strictly pickup (business) → dropoff.
            const jDistanceKm =
              j.pickup_lat != null && j.pickup_lng != null
              && j.dropoff_lat != null && j.dropoff_lng != null
                ? haversineKm(
                    { lat: Number(j.pickup_lat), lng: Number(j.pickup_lng) },
                    { lat: Number(j.dropoff_lat), lng: Number(j.dropoff_lng) },
                  )
                : null;


            // Offer expiry lives at __raw.offer.expires_at for offers,
            // and __raw.quote_deadline_at for quote jobs.
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
                className="snap-center shrink-0 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-[0_18px_44px_-14px_rgba(15,23,42,0.35)] bg-white text-slate-900 relative"
              >
                {/* Colored header band */}
                <div className="relative overflow-hidden bg-gradient-to-l from-[#0b3b2e] via-[#12604a] to-[#1c8a5b] text-white px-3 pt-2.5 pb-2.5">
                  <div aria-hidden className="pointer-events-none absolute -top-14 -left-10 size-36 rounded-full bg-emerald-300/25 blur-3xl" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 size-36 rounded-full bg-sky-400/20 blur-3xl" />

                  <div className="relative flex items-start gap-2.5">
                    <div className="rounded-xl bg-white/15 ring-1 ring-white/25 p-0.5 backdrop-blur">
                      <BusinessLogo path={j.customer_logo_path} name={businessName} size={34} />
                    </div>
                    <div className="flex-1 min-w-0 text-end">
                      <div className="flex items-center gap-1 justify-end min-w-0">
                        <h3 className="font-extrabold text-white text-[13px] truncate">{businessName}</h3>
                        <span className="text-[10px] font-mono text-emerald-100/80 shrink-0">#{j.job_number}</span>
                      </div>
                      <div className="text-[10px] text-emerald-50/90 font-semibold mt-0.5">
                        {jobWord} · {j.requires_cash ? "מזומן" : "אשראי"}
                      </div>
                    </div>
                    <div className="shrink-0 text-end rounded-xl bg-white/95 text-slate-900 ring-1 ring-white/40 px-2 py-1 shadow-md">
                      {jIsQuote ? (
                        <>
                          <div className="text-xl font-extrabold text-amber-600 leading-none">₪?</div>
                          <div className="text-[9px] text-amber-700 font-semibold mt-0.5">הצעת מחיר</div>
                        </>
                      ) : (
                        <>
                          <div className="leading-none">
                            <span className="text-xl font-extrabold text-[#0f7a3e]">
                              {Number(j.payment ?? 0).toFixed(0)}
                            </span>
                            <span className="text-sm font-extrabold text-[#0f7a3e] mr-0.5">₪</span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-semibold mt-0.5">תשלום</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta chips (timer inline, no dedicated row) */}
                <div className="px-3 pt-2 pb-2 flex items-center gap-1 flex-wrap bg-white">
                  <AcceptTimerChip expiresAt={offerExpiresAt} />
                  {jDistanceKm != null && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-slate-100 ring-1 ring-slate-200 text-slate-700 text-[10px] font-bold">
                      <RouteIcon className="size-2.5" />
                      {jDistanceKm.toFixed(1)} ק״מ
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-slate-100 ring-1 ring-slate-200 text-slate-700 text-[10px] font-bold">
                    <Clock className="size-2.5" />
                    {pickupTime}
                  </span>
                  {j.delivery_deadline && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-rose-50 ring-1 ring-rose-200 text-rose-700 text-[10px] font-bold">
                      <AlarmClock className="size-2.5" />
                      מסירה עד {new Date(j.delivery_deadline).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {packages > 0 && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-slate-100 ring-1 ring-slate-200 text-slate-700 text-[10px] font-bold">
                      <Package className="size-2.5" />
                      {jIsMove ? `${packages} פריטים` : packages}
                    </span>
                  )}
                  {jIsMove && j.item_category && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-indigo-50 ring-1 ring-indigo-200 text-indigo-700 text-[10px] font-bold">
                      <Package className="size-2.5" />
                      {j.item_category}
                    </span>
                  )}
                  {jIsMove && j.dropoff_floor != null && String(j.dropoff_floor) !== "" && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 text-[10px] font-bold">
                      <Layers className="size-2.5" />
                      קומה {j.dropoff_floor}
                    </span>
                  )}
                  {j.vehicle_required && (
                    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-slate-100 ring-1 ring-slate-200 text-slate-700 text-[10px] font-bold">
                      <Store className="size-2.5" />
                      {j.vehicle_required}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-bold ring-1 ${j.requires_cash ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-sky-50 text-sky-700 ring-sky-200"}`}>
                    <Coins className="size-2.5" />
                    {j.requires_cash ? "מזומן" : "אשראי"}
                  </span>
                </div>


                {/* Route */}
                <div className="mx-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 size-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <MapPin className="size-3 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-end">
                      <div className="text-[9px] text-slate-500 font-semibold leading-none">איסוף</div>
                      <div className="text-[12px] font-extrabold text-slate-900 truncate">{pickupAddr}</div>
                    </div>
                  </div>
                  <div className="mr-3 my-0.5 h-2 border-r-2 border-dashed border-slate-300" />
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 size-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <Navigation2 className="size-3 text-[#0f7a3e]" />
                    </div>
                    <div className="flex-1 min-w-0 text-end">
                      <div className="text-[9px] text-slate-500 font-semibold leading-none">מסירה</div>
                      <div className="text-[12px] font-extrabold text-slate-900 truncate">{dropoffAddr}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-2.5 pb-2.5 flex items-stretch gap-2 bg-white">
                  {jIsQuote ? (
                    <Button
                      className="flex-1 bg-[#35AD29] hover:bg-[#2d9623] text-white h-12 rounded-xl font-extrabold text-[14px] shadow-lg shadow-emerald-200"
                      onClick={() => onQuote(j)}
                    >
                      {jIsMove ? "אני מציע מחיר להובלה" : "אני מציע מחיר"}
                    </Button>
                  ) : (
                    <Button
                      className="relative flex-1 overflow-hidden bg-gradient-to-l from-[#2d9623] via-[#35AD29] to-[#4ac93a] hover:brightness-110 text-white h-12 rounded-xl border-0 animate-claim-pulse px-2"
                      disabled={claiming}
                      onClick={() => onClaim(j)}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                        <span className="absolute top-0 -left-1/3 h-full w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-claim-shine" />
                      </span>
                      <span className="relative z-10 flex items-center justify-center gap-1.5 w-full">
                        <span className="text-[13px] font-black tracking-tight">
                          {jIsMove ? "קח את ההובלה עכשיו" : "קח משלוח עכשיו והרווח כסף"}
                        </span>
                        {claiming ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center text-white/95 animate-chevron-nudge">
                            <ChevronsLeft className="size-4" />
                          </span>
                        )}
                      </span>
                    </Button>
                  )}
                  {onDetails && (
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl font-bold bg-white border-slate-300 text-slate-700 hover:bg-slate-50 text-[12px] px-3"
                      onClick={() => onDetails(j)}
                    >
                      <Info className="size-3.5" />
                      פרטים
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl font-bold bg-white border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-[12px] px-3"
                    onClick={() => onDecline(j)}
                    aria-label="דלג"
                  >
                    דלג
                  </Button>
                </div>
              </div>
            );
          };

          const hasMultiple = scoredJobs.length >= 2;

          return (
            <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:bottom-3 z-10 pointer-events-none">
              {/* Toolbar: prev · counter+dots · next — sits above the card so it never overlaps content */}
              {hasMultiple && (
                <div dir="rtl" className="pointer-events-auto flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => goToIdx(activeIdx - 1)}
                    className="size-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    aria-label="הצעה קודמת"
                  >
                    <ChevronRight className="size-4" />
                  </button>

                  <div className="flex items-center gap-2 bg-white/95 border border-slate-200 shadow-sm rounded-full px-2.5 py-1">
                    <span className="text-[11px] font-extrabold text-slate-800">
                      {activeIdx + 1} / {scoredJobs.length}
                    </span>
                    <div className="flex gap-1">
                      {scoredJobs.map((s, i) => (
                        <button
                          key={s.job.id}
                          onClick={() => goToIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === activeIdx ? "w-5 bg-[#35AD29]" : "w-1.5 bg-slate-300"
                          }`}
                          aria-label={`הצעה ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => goToIdx(activeIdx + 1)}
                    className="size-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                    aria-label="הצעה הבאה"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                </div>
              )}

              {/* Social-pressure pill above the active card */}
              {active && (
                <div className="pointer-events-none">
                  <PressurePill jobId={active.id} />
                </div>
              )}


              {/* Horizontal snap carousel — one card per viewport width */}
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
                {scoredJobs.map((s) => renderCard(s.job))}
              </div>
            </div>
          );
        })()}

        {scoredJobs.length === 0 && (
          <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:bottom-3 z-10 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow-md px-4 py-3 text-center text-slate-500 text-[13px]">
            אין עבודות זמינות באזור כרגע. נסה שוב בעוד מעט.
          </div>
        )}
      </div>
    </div>
  );
}
