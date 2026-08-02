/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MapPin, Navigation, Package, CheckCircle2, Phone, MessageCircle,
  Layers, Plus, Minus, Crosshair, ChevronRight, ChevronLeft, ClipboardCheck,
  Route as RouteIcon, Clock, Info,
} from "lucide-react";
import { nestOpenConversation } from "@/lib/nest-chat";
import {
  nestGetJobOutcome,
  nestListJobStatusLogs,
  nestListJobs,
  nestPutJobOutcome,
} from "@/lib/nest-jobs";
import { useMyCourier } from "@/components/CourierShell";
import { toast } from "sonner";
import { geocodeAddresses } from "@/lib/geocode.functions";
import { useNavigate } from "@tanstack/react-router";

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

declare global {
  interface Window {
    google: typeof google;
    __initCourierActiveMap?: () => void;
  }
}

type ActiveJob = {
  id: string;
  job_number?: string | number | null;
  job_type?: string | null;
  status?: string | null;
  customer_name?: string | null;
  description?: string | null;
  payment?: number | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
  pickup_instructions?: string | null;
  pickup_notes?: string | null;
  pickup_ready?: boolean | null;
  pickup_ready_at?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  dropoff_building?: string | null;
  dropoff_entrance?: string | null;
  dropoff_floor?: string | null;
  dropoff_apartment?: string | null;
  dropoff_notes?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  number_of_packages?: number | null;
  item_category?: string | null;
  package_type?: string | null;
  job_outcomes?: any;
};

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

function stagePin(label: string, accent: string, filled: boolean) {
  const w = Math.max(56, 24 + label.length * 9);
  const h = 30;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w + 4}" height="${h + 12}" viewBox="0 0 ${w + 4} ${h + 12}">
  <defs><filter id="f" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0006"/></filter></defs>
  <g filter="url(#f)">
    <rect x="2" y="2" rx="9" ry="9" width="${w}" height="${h}" fill="${filled ? accent : "#fff"}" stroke="${accent}" stroke-width="2"/>
    <polygon points="${(w + 4) / 2 - 6},${h + 1} ${(w + 4) / 2 + 6},${h + 1} ${(w + 4) / 2},${h + 10}" fill="${accent}"/>
    <text x="${(w + 4) / 2}" y="${h / 2 + 6}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial" font-size="13" font-weight="800" fill="${filled ? "#fff" : accent}">${label}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function WazeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#33CCFF"
        d="M12 2.6c-4.9 0-8.9 3.6-8.9 8 0 1 .2 1.9.6 2.8.2.5.2 1 0 1.5-.3.7-.4 1.5-.3 2.3.1.5.5.9 1 .9h1.5c.3 1.1 1.3 1.9 2.5 1.9s2.2-.8 2.5-1.9h3c.3 1.1 1.3 1.9 2.5 1.9s2.2-.8 2.5-1.9h.5c1.3 0 2.4-.9 2.7-2.1.7-2.9-.4-5.9-2.6-7.8C18.2 4.1 15.3 2.6 12 2.6z"
      />
      <circle cx="9.2" cy="9.8" r="1.1" fill="#0F1E2D" />
      <circle cx="14.8" cy="9.8" r="1.1" fill="#0F1E2D" />
      <path d="M9 13.2c.6 1 1.7 1.7 3 1.7s2.4-.7 3-1.7" stroke="#0F1E2D" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function CourierActiveMap() {
  const { data: me } = useMyCourier();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const openBusinessChat = async (job: ActiveJob | null | undefined) => {
    if (!job) return;
    const businessId = (job as any)?.customer_id ?? (job as any)?.business_id ?? null;
    if (!businessId) { toast.error("חסר מזהה עסק"); return; }
    try {
      const conv = await nestOpenConversation({
        kind: "courier_business",
        business_id: businessId,
        job_id: job.id,
      });
      navigate({ to: "/courier/messages", search: { c: conv.id } as never });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "לא ניתן לפתוח צ׳אט עם העסק");
    }
  };
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const dropMarkerRef = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Poll jobs and status from Nest.
  useEffect(() => {
    if (!me?.id) return;
    const timer = window.setInterval(() => {
      qc.invalidateQueries({ queryKey: ["active-jobs-map", me.id] });
      qc.invalidateQueries({ queryKey: ["active-job-steps-map"] });
      qc.invalidateQueries({ queryKey: ["active-job-outcomes-map"] });
    }, 4_000);
    return () => window.clearInterval(timer);
  }, [me?.id, qc]);

  const { data: jobsRaw = [] } = useQuery({
    queryKey: ["active-jobs-map", me?.id],
    enabled: !!me?.id,
    refetchInterval: 4_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const rows = await nestListJobs({ limit: 100 });
      const terminal = new Set(["הושלמה", "בוטלה"]);
      return rows.filter(
        (j) => j.selected_courier_id === me!.id && !terminal.has(String(j.status ?? "")),
      ) as ActiveJob[];
    },
  });

  const jobIdsKey = jobsRaw.map((j) => j.id).join(",");

  const { data: lastSteps = {} } = useQuery({
    queryKey: ["active-job-steps-map", jobIdsKey],
    enabled: jobsRaw.length > 0,
    refetchInterval: 4_000,
    queryFn: async () => {
      const logs = await Promise.all(
        jobsRaw.map((j) => nestListJobStatusLogs(j.id).catch(() => [])),
      );
      const map: Record<string, string> = {};
      jobsRaw.forEach((job, i) => {
        const sorted = [...(logs[i] ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        if (sorted[0]) map[job.id] = sorted[0].new_status;
      });
      return map;
    },
  });

  const { data: outcomesByJob = {} } = useQuery({
    queryKey: ["active-job-outcomes-map", jobIdsKey],
    enabled: jobsRaw.length > 0,
    refetchInterval: 4_000,
    queryFn: async () => {
      const pairs = await Promise.all(
        jobsRaw.map(async (j) => [j.id, await nestGetJobOutcome(j.id).catch(() => null)] as const),
      );
      return Object.fromEntries(pairs.filter(([, o]) => o));
    },
  });

  // Geocode missing coords
  const [geoCache, setGeoCache] = useState<Record<string, { lat: number; lng: number } | null>>({});
  useEffect(() => {
    const needs: { id: string; address: string }[] = [];
    for (const j of jobsRaw) {
      const pKey = `${j.id}:p`;
      const dKey = `${j.id}:d`;
      if ((j.pickup_lat == null || j.pickup_lng == null) && !(pKey in geoCache)) {
        const addr = String(j.pickup_address ?? j.pickup_area ?? "").trim();
        if (addr) needs.push({ id: pKey, address: addr });
      }
      if ((j.dropoff_lat == null || j.dropoff_lng == null) && !(dKey in geoCache)) {
        const addr = String(j.dropoff_address ?? j.dropoff_area ?? "").trim();
        if (addr) needs.push({ id: dKey, address: addr });
      }
    }
    if (!needs.length) return;
    let cancelled = false;
    geocodeAddresses({ data: { items: needs } })
      .then((res) => {
        if (cancelled) return;
        setGeoCache((prev) => {
          const next = { ...prev };
          for (const r of res) next[r.id] = r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null;
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [jobsRaw, geoCache]);

  const jobs: ActiveJob[] = useMemo(() => {
    return jobsRaw.map((j) => {
      let out: ActiveJob = {
        ...j,
        job_outcomes: outcomesByJob[j.id] ?? null,
      };
      if (out.pickup_lat == null || out.pickup_lng == null) {
        const g = geoCache[`${j.id}:p`];
        if (g) out = { ...out, pickup_lat: g.lat, pickup_lng: g.lng };
      }
      if (out.dropoff_lat == null || out.dropoff_lng == null) {
        const g = geoCache[`${j.id}:d`];
        if (g) out = { ...out, dropoff_lat: g.lat, dropoff_lng: g.lng };
      }
      return out;
    });
  }, [jobsRaw, geoCache, outcomesByJob]);

  // Auto-pick first job
  useEffect(() => {
    if (activeId && jobs.some((j) => j.id === activeId)) return;
    setActiveId(jobs[0]?.id ?? null);
  }, [jobs, activeId]);

  const active = useMemo(() => jobs.find((j) => j.id === activeId) ?? null, [jobs, activeId]);
  const activeIdx = useMemo(() => jobs.findIndex((j) => j.id === activeId), [jobs, activeId]);

  // Load Google Maps script
  useEffect(() => {
    if (!BROWSER_KEY) { setMapError("מפת Google לא מוגדרת"); return; }

    let cancelled = false;
    let timer: number | undefined;
    const waitForMaps = () => {
      if (cancelled) return;
      if (typeof window.google?.maps?.Map === "function") {
        setReady(true);
        return;
      }
      timer = window.setTimeout(waitForMaps, 80);
    };

    window.__initCourierActiveMap = waitForMaps;
    waitForMaps();

    if (document.querySelector("script[src*='maps.googleapis.com/maps/api/js']")) {
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initCourierActiveMap${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.dataset.courierActiveMap = "1";
    s.onerror = () => setMapError("טעינת המפה נכשלה");
    document.head.appendChild(s);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const myPos = useMemo(() => {
    if (me?.last_lat != null && me?.last_lng != null) {
      return { lat: Number(me.last_lat), lng: Number(me.last_lng) };
    }
    return null;
  }, [me?.last_lat, me?.last_lng]);

  useEffect(() => {
    if (!ready || !mapDivRef.current) return;

    if (mapRef.current) {
      setMapLoaded(true);
      window.google?.maps?.event.trigger(mapRef.current, "resize");
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const div = mapDivRef.current;

    const initMap = async () => {
      try {
        if (window.google?.maps?.importLibrary) {
          await window.google.maps.importLibrary("maps");
        }
        if (cancelled || !div || !window.google?.maps?.Map) return;

        mapRef.current = new window.google.maps.Map(div, {
          center: myPos ?? DEFAULT_CENTER,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        setMapLoaded(true);

        const repaint = () => {
          if (!mapRef.current) return;
          window.google.maps.event.trigger(mapRef.current, "resize");
        };

        ro = new ResizeObserver(repaint);
        ro.observe(div);
        requestAnimationFrame(repaint);
      } catch {
        if (!cancelled) setMapError("טעינת המפה נכשלה");
      }
    };

    initMap();

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [ready]);

  // Pan to myPos when it arrives — without rebuilding the map
  useEffect(() => {
    if (!mapRef.current || !myPos) return;
    mapRef.current.panTo(myPos);
  }, [myPos]);

  // Me marker
  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    if (meMarkerRef.current) { meMarkerRef.current.setMap(null); meMarkerRef.current = null; }
    if (!myPos) return;
    meMarkerRef.current = new window.google.maps.Marker({
      position: myPos, map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3,
      },
      zIndex: 999,
    });
  }, [myPos, ready]);

  // Active job pickup/drop markers + route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;
    if (pickupMarkerRef.current) { pickupMarkerRef.current.setMap(null); pickupMarkerRef.current = null; }
    if (dropMarkerRef.current) { dropMarkerRef.current.setMap(null); dropMarkerRef.current = null; }
    if (polyRef.current) { polyRef.current.setMap(null); polyRef.current = null; }
    if (!active) return;

    const outcome = Array.isArray((active as any).job_outcomes) ? (active as any).job_outcomes[0] : (active as any).job_outcomes;
    const pickedUp = !!outcome?.picked_up_at;
    const delivered = !!outcome?.delivered_at;

    const pickup = active.pickup_lat != null && active.pickup_lng != null
      ? { lat: Number(active.pickup_lat), lng: Number(active.pickup_lng) } : null;
    const drop = active.dropoff_lat != null && active.dropoff_lng != null
      ? { lat: Number(active.dropoff_lat), lng: Number(active.dropoff_lng) } : null;

    if (pickup) {
      pickupMarkerRef.current = new window.google.maps.Marker({
        position: pickup, map,
        icon: {
          url: stagePin("איסוף", "#1e6cf2", pickedUp),
          scaledSize: new window.google.maps.Size(80, 42),
          anchor: new window.google.maps.Point(40, 42),
        },
        zIndex: 700,
      });
    }
    if (drop) {
      dropMarkerRef.current = new window.google.maps.Marker({
        position: drop, map,
        icon: {
          url: stagePin("מסירה", "#35AD29", delivered),
          scaledSize: new window.google.maps.Size(80, 42),
          anchor: new window.google.maps.Point(40, 42),
        },
        zIndex: 700,
      });
    }

    // Polyline: depending on stage - me→pickup (if not picked up) else pickup→drop
    const path: google.maps.LatLngLiteral[] = [];
    if (!pickedUp) {
      if (myPos) path.push(myPos);
      if (pickup) path.push(pickup);
    } else if (!delivered) {
      if (pickup) path.push(pickup);
      if (drop) path.push(drop);
    } else if (pickup && drop) {
      path.push(pickup, drop);
    }
    if (path.length >= 2) {
      polyRef.current = new window.google.maps.Polyline({
        path,
        strokeColor: pickedUp ? "#35AD29" : "#1e6cf2",
        strokeOpacity: 0,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "10px" }],
        map,
      });
    }

    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds();
    if (myPos) bounds.extend(myPos);
    if (pickup) bounds.extend(pickup);
    if (drop) bounds.extend(drop);
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80);
  }, [active, myPos, ready]);

  const setStep = useMutation({
    mutationFn: async ({ job_id, step }: { job_id: string; step: string }) => {
      const now = new Date().toISOString();
      if (step === "אספתי") {
        await nestPutJobOutcome(job_id, { courier_id: me?.id ?? null, picked_up_at: now });
      } else if (step === "נמסר") {
        await nestPutJobOutcome(job_id, { courier_id: me?.id ?? null, delivered_at: now });
      }
      const statusMap: Record<string, string> = {
        "בדרך לאיסוף": "heading_to_pickup",
        "אספתי": "picked_up",
        "נמסר": "delivered",
      };
      const status = statusMap[step];
      if (status) {
        try {
          const { notifyBusinessJobStatusFn } = await import("@/lib/business-status-push.functions");
          void notifyBusinessJobStatusFn({ data: { jobId: job_id, status } });
        } catch {}
        try {
          const { notifyCustomerJobStatusFn } = await import("@/lib/customer-status-push.functions");
          void notifyCustomerJobStatusFn({ data: { jobId: job_id, status } });
        } catch {}
      }
    },
    onSuccess: () => {
      toast.success("הסטטוס עודכן");
      qc.invalidateQueries({ queryKey: ["active-jobs-map"] });
      qc.invalidateQueries({ queryKey: ["active-job-steps-map"] });
      qc.invalidateQueries({ queryKey: ["active-job-outcomes-map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const openNav = (addr?: string | null, lat?: number | null, lng?: number | null) => {
    if (lat != null && lng != null) {
      window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, "_blank");
    } else if (addr) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`, "_blank");
    } else {
      toast.error("אין כתובת");
    }
  };


  const zoomBy = (delta: number) => {
    const m = mapRef.current; if (!m) return;
    m.setZoom((m.getZoom() ?? 13) + delta);
  };
  const cycleMapType = () => {
    const m = mapRef.current; if (!m) return;
    m.setMapTypeId(m.getMapTypeId() === "roadmap" ? "hybrid" : "roadmap");
  };

  const goToIdx = (idx: number) => {
    if (jobs.length === 0) return;
    const wrapped = ((idx % jobs.length) + jobs.length) % jobs.length;
    setActiveId(jobs[wrapped].id);
  };

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 py-14 text-center text-slate-500">
        <ClipboardCheck className="size-10 mx-auto mb-3 opacity-50" />
        אין משלוחים פעילים כרגע
      </div>
    );
  }

  if (!active) return null;

  const outcome = Array.isArray((active as any).job_outcomes) ? (active as any).job_outcomes[0] : (active as any).job_outcomes;
  const pickedUp = !!outcome?.picked_up_at;
  const delivered = !!outcome?.delivered_at;
  const current = (lastSteps as Record<string, string>)[active.id];
  const started = active.status === "פעילה" || pickedUp || delivered || current === "בדרך לאיסוף";

  const distanceKm = active.pickup_lat != null && active.pickup_lng != null
    && active.dropoff_lat != null && active.dropoff_lng != null
    ? haversineKm(
        { lat: Number(active.pickup_lat), lng: Number(active.pickup_lng) },
        { lat: Number(active.dropoff_lat), lng: Number(active.dropoff_lng) },
      )
    : null;

  const qty = Number(active.number_of_packages ?? 0);
  const category = active.item_category ?? active.package_type ?? active.job_type ?? "—";

  // Stage label
  const stageLabel = delivered ? "נמסר" : pickedUp ? "בדרך למסירה" : started ? "יצאתי לאיסוף" : "ממתין להתחלה";
  const stageColor = delivered ? "bg-emerald-100 text-emerald-700" : pickedUp ? "bg-[#35AD29] text-white" : started ? "bg-[#1e6cf2] text-white" : "bg-slate-200 text-slate-700";

  return (
    <div className="-m-3 sm:m-0 sm:rounded-3xl sm:border sm:border-slate-200 sm:bg-white sm:shadow-sm sm:overflow-hidden h-[calc(100dvh-12.25rem)] sm:h-auto flex flex-col min-h-0 overflow-hidden">
      {/* Map area — fixed share of viewport so the panel always has room */}
      <div className="relative flex-1 min-h-0 sm:basis-auto sm:max-h-none sm:min-h-[320px] sm:h-auto sm:flex-1 bg-slate-100">
        {mapError ? (
          <div className="h-full flex items-center justify-center text-slate-500 bg-slate-50 text-sm">{mapError}</div>
        ) : (
          <>
            <div ref={mapDivRef} data-active-map className="absolute inset-0 z-0 w-full h-full bg-slate-100 sm:relative sm:h-[420px]" />
            {!mapLoaded && (
              <div className="absolute inset-0 z-[1] grid place-items-center bg-slate-100 text-xs font-bold text-slate-500">
                טוען מפה…
              </div>
            )}
          </>
        )}

        {/* Floating right rail */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
          <button onClick={cycleMapType} className="size-9 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-700 active:scale-95" aria-label="שכבות">
            <Layers className="size-4" />
          </button>
          {myPos && (
            <button onClick={() => { mapRef.current?.panTo(myPos); mapRef.current?.setZoom(14); }} className="size-9 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-700 active:scale-95" aria-label="מרכז עליי">
              <Crosshair className="size-4" />
            </button>
          )}
          <div className="rounded-2xl bg-white shadow-md overflow-hidden flex flex-col">
            <button onClick={() => zoomBy(1)} className="size-9 flex items-center justify-center text-slate-700 active:scale-95 border-b border-slate-100" aria-label="הגדל">
              <Plus className="size-4" />
            </button>
            <button onClick={() => zoomBy(-1)} className="size-9 flex items-center justify-center text-slate-700 active:scale-95" aria-label="הקטן">
              <Minus className="size-4" />
            </button>
          </div>
        </div>

        {/* Top stage badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
          <span className={`px-3 h-8 rounded-full text-[11px] font-extrabold flex items-center shadow-md ${stageColor}`}>
            {stageLabel}
          </span>
        </div>
      </div>

      {/* Bottom sheet — fills remaining height, no scroll on mobile */}
      <div className="bg-white border-t border-slate-100 rounded-t-3xl -mt-3 relative z-10 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] shrink-0 flex flex-col sm:flex-none sm:overflow-visible sm:max-h-none sm:block">

        <div className="pt-1 pb-0.5 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:pb-3 pt-0.5 flex-1 min-h-0 flex flex-col gap-1.5 sm:block">
          {jobs.length >= 2 && (
            <div className="flex items-center justify-between gap-2 shrink-0">
              <button onClick={() => goToIdx(activeIdx + 1)} className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 text-slate-700 active:scale-95 text-[11px] font-bold">
                <ChevronRight className="size-3.5" /> הבא
              </button>
              <div className="text-[11px] font-bold text-slate-600">משלוח {activeIdx + 1} מתוך {jobs.length}</div>
              <button onClick={() => goToIdx(activeIdx - 1)} className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center gap-1 text-slate-700 active:scale-95 text-[11px] font-bold">
                קודם <ChevronLeft className="size-3.5" />
              </button>
            </div>
          )}

          {/* Header: price + addresses */}
          <div className="flex items-stretch gap-2 pb-1.5 border-b border-slate-100 shrink-0">
            <div className="text-center min-w-[64px] flex flex-col items-center justify-center">
              <div className="leading-none">
                <span className="text-2xl font-extrabold text-[#35AD29]">{Number(active.payment ?? 0).toFixed(0)}</span>
                <span className="text-base font-extrabold text-[#35AD29] mr-0.5">₪</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 font-mono">#{active.job_number}</div>
            </div>

            <div className="flex-1 text-end relative pr-2 border-r border-slate-100 min-w-0">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[9px] text-slate-500 font-medium">איסוף</span>
                <span className={`size-1.5 rounded-full ${pickedUp ? "bg-emerald-500" : "bg-[#1e6cf2]"}`} />
              </div>
              <div className="font-extrabold text-slate-900 leading-tight text-[12px] break-words">
                {[active.pickup_address, active.pickup_area].filter(Boolean).join(", ") || "—"}
              </div>

              <div className="flex items-center gap-1 justify-end mt-1">
                <span className="text-[9px] text-slate-500 font-medium">מסירה</span>
                <MapPin className={`size-3 ${delivered ? "text-emerald-500" : "text-[#35AD29]"}`} />
              </div>
              <div className="font-extrabold text-slate-900 leading-tight text-[12px] break-words">
                {[active.dropoff_address, active.dropoff_area].filter(Boolean).join(", ") || "—"}
              </div>
            </div>
          </div>

          {/* Meta chips */}
          <div className="grid grid-cols-4 gap-1 shrink-0">
            {[
              { icon: RouteIcon, label: "ק״מ", value: distanceKm != null ? distanceKm.toFixed(1) : "—" },
              { icon: Clock, label: "זמן", value: active.job_time ?? active.job_date ?? "מיידי" },
              { icon: Package, label: "כמות", value: qty > 0 ? String(qty) : "1" },
              { icon: Info, label: "סוג", value: category },
            ].map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 px-1 py-1 flex flex-col items-center justify-center text-center min-w-0">
                <div className="flex items-center gap-0.5 text-slate-500">
                  <c.icon className="size-2.5" />
                  <span className="text-[9px] font-semibold leading-none tracking-tight">{c.label}</span>
                </div>
                <div className="text-[11px] font-extrabold text-slate-900 leading-tight mt-0.5 truncate max-w-full">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Status progress steps — desktop only */}
          <div className="hidden sm:flex items-center gap-1 py-1">
            <StepDot label="בדרך" done={started} active={!started} />
            <StepBar done={pickedUp} />
            <StepDot label="נאסף" done={pickedUp} active={started && !pickedUp} />
            <StepBar done={delivered} />
            <StepDot label="נמסר" done={delivered} active={pickedUp && !delivered} />
          </div>

          {/* Row 1: Navigate-pickup | Single dynamic stage button | Navigate-dropoff */}
          {(() => {
            const nextStep: "בדרך לאיסוף" | "אספתי" | "נמסר" | null =
              delivered ? null : pickedUp ? "נמסר" : started ? "אספתי" : "בדרך לאיסוף";
            const stageBtnLabel = delivered
              ? "המשלוח הושלם"
              : nextStep === "בדרך לאיסוף"
                ? "יצאתי לאיסוף"
                : nextStep === "אספתי"
                  ? "אספתי"
                  : "נמסר";
            const stageBtnIcon =
              nextStep === "בדרך לאיסוף" ? <Navigation className="size-4" />
              : nextStep === "אספתי" ? <Package className="size-4" />
              : <CheckCircle2 className="size-4" />;
            const stageBtnColor = delivered
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : nextStep === "בדרך לאיסוף"
                ? "bg-[#1e6cf2] hover:bg-[#1959c4] text-white"
                : nextStep === "אספתי"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-[#35AD29] hover:bg-[#2d9623] text-white";
            return (
              <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-1.5 shrink-0 [@media(max-height:760px)]:gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="נווט לאיסוף"
                  className="h-14 rounded-xl font-bold border-[#1e6cf2]/30 bg-[#1e6cf2]/5 text-[#1e6cf2] hover:bg-[#1e6cf2]/10 text-[12px] px-2 flex items-center justify-center gap-1.5 [@media(max-height:760px)]:h-12"
                  onClick={() => openNav(active.pickup_address ?? active.pickup_area, active.pickup_lat, active.pickup_lng)}
                >
                  <Navigation className="size-4" />
                  <span>נווט לאיסוף</span>
                </Button>

                <Button
                  size="sm"
                  className={`h-14 rounded-xl font-extrabold text-[15px] px-3 shadow-md whitespace-nowrap [@media(max-height:760px)]:h-12 [@media(max-height:760px)]:text-[14px] ${stageBtnColor}`}
                  onClick={() => nextStep && setStep.mutate({ job_id: active.id, step: nextStep })}
                  disabled={setStep.isPending || !nextStep}
                >
                  {stageBtnIcon}
                  <span className="mr-1.5">{stageBtnLabel}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  aria-label="נווט למסירה"
                  className="h-14 rounded-xl font-bold border-[#35AD29]/30 bg-[#35AD29]/5 text-[#35AD29] hover:bg-[#35AD29]/10 text-[12px] px-2 flex items-center justify-center gap-1.5 [@media(max-height:760px)]:h-12"
                  onClick={() => openNav(active.dropoff_address ?? active.dropoff_area, active.dropoff_lat, active.dropoff_lng)}
                >
                  <Navigation className="size-4" />
                  <span>נווט למסירה</span>
                </Button>
              </div>
            );
          })()}

          {/* Row 2: Chat with business | Details */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0 [@media(max-height:760px)]:gap-1">
            <Button
              variant="outline"
              size="sm"
              aria-label="צ׳אט עם העסק"
              className="h-9 rounded-xl font-bold border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 text-[12px] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:text-[11px]"
              onClick={() => openBusinessChat(active)}
            >
              <MessageCircle className="size-3.5" /> <span>צ׳אט עם העסק</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="פרטי משלוח"
              className="h-9 rounded-xl font-bold border-slate-200 text-slate-700 text-[12px] [@media(max-height:760px)]:h-8 [@media(max-height:760px)]:text-[11px]"
              onClick={() => setDetailsOpen(true)}
            >
              <Info className="size-3.5" /> <span>פרטי המשלוח</span>
            </Button>
          </div>



          {/* Contacts — desktop only */}
          <div className="hidden sm:grid grid-cols-2 gap-1.5 pt-1.5">
            <ContactRow label="שולח" name={active.pickup_contact_name} phone={active.pickup_contact_phone} />
            <ContactRow label="נמען" name={active.recipient_name} phone={active.recipient_phone} />
          </div>

          {active.description && (
            <div className="hidden sm:block mt-2 bg-slate-50 rounded-xl p-2.5 text-end text-[12px] text-slate-700">
              {active.description}
            </div>
          )}

          {active.customer_name && (
            <div className="hidden sm:flex mt-2 items-center justify-end gap-2 text-[12px] text-slate-500">
              <Badge variant="outline" className="text-[10px]">לקוח</Badge>
              <span className="font-bold text-slate-700">{active.customer_name}</span>
            </div>
          )}
        </div>
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" dir="rtl" className="rounded-t-3xl border-slate-200 p-0 max-h-[82dvh] overflow-y-auto">
          <SheetHeader className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-4 pt-4 pb-3 text-right">
            <SheetTitle className="text-right text-base font-extrabold text-slate-900">
              פרטי משלוח #{active.job_number ?? "—"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <DetailStat label="תשלום" value={`${Number(active.payment ?? 0).toFixed(0)}₪`} />
              <DetailStat label="כמות" value={qty > 0 ? String(qty) : "1"} />
              <DetailStat label="קטגוריה" value={category} />
            </div>

            <DetailBlock title="שולח / איסוף">
              <DetailLine label="כתובת" value={active.pickup_address ?? active.pickup_area} />
              <DetailLine label="שם" value={active.pickup_contact_name ?? active.customer_name} />
              <DetailContact phone={active.pickup_contact_phone} />
              <DetailLine label="הוראות" value={active.pickup_instructions ?? active.pickup_notes} />
              {active.pickup_ready === false && (
                <DetailLine
                  label="מוכן לאיסוף"
                  value={active.pickup_ready_at ? new Date(active.pickup_ready_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) : "לא עכשיו"}
                />
              )}
              <Button variant="outline" size="sm" className="mt-2 h-10 w-full rounded-2xl font-bold border-slate-200"
                onClick={() => openNav(active.pickup_address ?? active.pickup_area, active.pickup_lat, active.pickup_lng)}>
                <Navigation className="size-4" /> ניווט לאיסוף
              </Button>
            </DetailBlock>


            <DetailBlock title="נמען / מסירה">
              <DetailLine label="כתובת" value={[active.dropoff_address, active.dropoff_area].filter(Boolean).join(", ") || null} />
              <DetailLine label="בניין" value={active.dropoff_building} />
              <DetailLine label="כניסה" value={active.dropoff_entrance} />
              <DetailLine label="קומה" value={active.dropoff_floor} />
              <DetailLine label="דירה" value={active.dropoff_apartment} />
              <DetailLine label="שם" value={active.recipient_name} />
              <DetailContact phone={active.recipient_phone} />
              <DetailLine label="הערות למסירה" value={active.dropoff_notes} multiline />
              <Button variant="outline" size="sm" className="mt-2 h-10 w-full rounded-2xl font-bold border-slate-200"
                onClick={() => openNav(active.dropoff_address ?? active.dropoff_area, active.dropoff_lat, active.dropoff_lng)}>
                <Navigation className="size-4" /> ניווט למסירה
              </Button>
            </DetailBlock>

            <DetailBlock title="פרטי עבודה">
              <DetailLine label="זמן" value={active.job_time ?? active.job_date ?? "מיידי"} />
              <DetailLine label="סוג" value={active.job_type} />
              <DetailLine label="מרחק" value={distanceKm != null ? `${distanceKm.toFixed(1)} ק״מ` : null} />
              <DetailLine label="הערות" value={active.description} multiline />
            </DetailBlock>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 text-right">
      <h3 className="text-sm font-extrabold text-slate-900 mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-center min-w-0">
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function DetailLine({ label, value, multiline = false }: { label: string; value?: string | number | null; multiline?: boolean }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-sm">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={`font-bold text-slate-800 ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value || "—"}</span>
    </div>
  );
}

function DetailContact({ phone }: { phone?: string | null }) {
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  if (!phone) return <DetailLine label="טלפון" value="לא הוזן" />;
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-sm items-center">
      <span className="text-xs font-semibold text-slate-500">טלפון</span>
      <div className="flex items-center justify-end gap-2 min-w-0">
        <a href={`tel:${phone}`} className="size-9 grid place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="חיוג">
          <Phone className="size-4" />
        </a>
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="size-9 grid place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="ווטסאפ">
          <MessageCircle className="size-4" />
        </a>
        <span className="truncate font-mono font-bold text-slate-800">{phone}</span>
      </div>
    </div>
  );
}

function StepDot({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className={`size-7 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 ${
        done ? "bg-[#35AD29] border-[#35AD29] text-white" :
        active ? "bg-white border-[#1e6cf2] text-[#1e6cf2]" :
        "bg-white border-slate-300 text-slate-400"
      }`}>
        {done ? <CheckCircle2 className="size-4" /> : "•"}
      </div>
      <span className={`text-[10px] font-bold ${done ? "text-[#35AD29]" : active ? "text-[#1e6cf2]" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

function StepBar({ done }: { done: boolean }) {
  return <div className={`flex-1 h-1 rounded-full ${done ? "bg-[#35AD29]" : "bg-slate-200"} mb-5`} />;
}

function ContactRow({ label, name, phone }: { label: string; name?: string | null; phone?: string | null }) {
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  if (!name && !phone) {
    return (
      <div className="rounded-xl border border-slate-200 p-2 text-end bg-white">
        <div className="text-[10px] text-slate-500">{label}</div>
        <div className="text-[11px] text-slate-400">לא הוזן</div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 p-2 text-end bg-white">
      <div className="text-[10px] text-slate-500">{label}</div>
      {name && <div className="text-[12px] font-bold text-slate-800 truncate">{name}</div>}
      {phone && (
        <div className="flex items-center justify-end gap-1 mt-1">
          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold">
            <Phone className="size-3" />
          </a>
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
            <MessageCircle className="size-3" />
          </a>
          <span className="text-[11px] text-slate-600 font-mono">{phone}</span>
        </div>
      )}
    </div>
  );
}
