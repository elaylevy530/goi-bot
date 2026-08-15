/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed } from "lucide-react";
import { loadGoogleMaps } from "@/components/customer/AddressAutocomplete";
import { useGpsLiveStatus } from "@/hooks/useCourierGpsTracker";
import {
  fetchDrivingRoute,
  haversineKm,
  nextRouteStep,
  type DrivingRoute,
  type LatLng,
  type RouteStep,
} from "@/lib/google-driving-route";
import { cn } from "@/lib/utils";

export type MissionStop = {
  address: string;
  lat?: number | null;
  lng?: number | null;
};

export type MissionRouteInfo = {
  distanceKm: number;
  durationMin: number;
  nextInstruction: string | null;
  nextDistanceM: number | null;
  maneuver: string | null;
};

type Props = {
  mode: "preview" | "navigate";
  destination: MissionStop;
  destinationKind: "pickup" | "dropoff";
  otherStop?: MissionStop | null;
  className?: string;
  onRoute?: (info: MissionRouteInfo | null) => void;
};

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };
const REROUTE_MIN_M = 90;
const REROUTE_MIN_MS = 25_000;

function token(el: HTMLElement | null, name: string, fallback: string) {
  if (!el) return fallback;
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

function asLatLng(stop?: MissionStop | null): LatLng | null {
  if (stop?.lat == null || stop?.lng == null) return null;
  const lat = Number(stop.lat);
  const lng = Number(stop.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function bearingDeg(from: LatLng, to: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function stopPin(label: string, fill: string, onFill: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <g>
    <circle cx="18" cy="16" r="14" fill="${fill}" stroke="${onFill}" stroke-width="3"/>
    <polygon points="12,28 24,28 18,40" fill="${fill}"/>
    <text x="18" y="21" text-anchor="middle" font-family="Heebo,system-ui,sans-serif" font-size="13" font-weight="800" fill="${onFill}">${label}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const q = address.trim();
  if (!q || q === "—" || !window.google?.maps?.Geocoder) return null;
  try {
    const geocoder = new window.google.maps.Geocoder();
    const results = await new Promise<google.maps.GeocoderResult[] | null>((resolve) => {
      geocoder.geocode({ address: q, region: "il" }, (rows, status) => {
        resolve(status === "OK" && rows?.length ? rows : null);
      });
    });
    const loc = results?.[0]?.geometry?.location;
    return loc ? { lat: loc.lat(), lng: loc.lng() } : null;
  } catch {
    return null;
  }
}

function useNavFix() {
  const stored = useGpsLiveStatus();
  const [fix, setFix] = useState<{ lat: number; lng: number; heading: number | null; accuracy: number | null } | null>(null);
  const prevRef = useRef<LatLng | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let heading = Number.isFinite(pos.coords.heading) ? pos.coords.heading : null;
        if (heading == null && prevRef.current && haversineKm(prevRef.current, next) > 0.008) {
          heading = bearingDeg(prevRef.current, next);
        }
        prevRef.current = next;
        setFix({
          lat: next.lat,
          lng: next.lng,
          heading,
          accuracy: pos.coords.accuracy ?? null,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (fix) return fix;
  if (stored.lat != null && stored.lng != null) {
    return { lat: stored.lat, lng: stored.lng, heading: null, accuracy: stored.accuracy };
  }
  return null;
}

export function MissionNavMap({
  mode,
  destination,
  destinationKind,
  otherStop,
  className,
  onRoute,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const destMarkerRef = useRef<google.maps.Marker | null>(null);
  const otherMarkerRef = useRef<google.maps.Marker | null>(null);
  const puckRef = useRef<google.maps.Marker | null>(null);
  const haloRef = useRef<google.maps.Circle | null>(null);
  const casingRef = useRef<google.maps.Polyline | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const destRef = useRef<LatLng | null>(asLatLng(destination));
  const otherRef = useRef<LatLng | null>(asLatLng(otherStop));
  const lastRouteOrigin = useRef<LatLng | null>(null);
  const lastRouteAt = useRef(0);
  const routeRef = useRef<DrivingRoute | null>(null);
  const followingRef = useRef(mode === "navigate");
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;

  const fix = useNavFix();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(mode === "navigate");
  followingRef.current = following;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError("טעינת המפה נכשלה");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    destRef.current = asLatLng(destination);
    otherRef.current = asLatLng(otherStop);
  }, [destination.lat, destination.lng, destination.address, otherStop?.lat, otherStop?.lng, otherStop?.address]);

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current || !window.google?.maps) return;
    const div = mapDivRef.current;
    const map = new window.google.maps.Map(div, {
      center: DEFAULT_CENTER,
      zoom: mode === "navigate" ? 16 : 13,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: "greedy",
      keyboardShortcuts: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    mapRef.current = map;
    map.addListener("dragstart", () => {
      followingRef.current = false;
      setFollowing(false);
    });
    const ro = new ResizeObserver(() => {
      window.google.maps.event.trigger(map, "resize");
    });
    ro.observe(div);
    return () => ro.disconnect();
  }, [ready, mode]);

  useEffect(() => {
    if (!ready || !window.google?.maps) return;
    let cancelled = false;
    const resolve = async () => {
      if (!destRef.current && destination.address) {
        const loc = await geocodeAddress(destination.address);
        if (!cancelled && loc) destRef.current = loc;
      }
      if (!otherRef.current && otherStop?.address) {
        const loc = await geocodeAddress(otherStop.address);
        if (!cancelled && loc) otherRef.current = loc;
      }
      if (!cancelled) drawStopsAndRoute();
    };
    void resolve();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, destination.address, destination.lat, destination.lng, otherStop?.address, otherStop?.lat, otherStop?.lng, destinationKind, mode]);

  const followCamera = (pos: LatLng, heading: number | null) => {
    const map = mapRef.current;
    if (!map || !followingRef.current) return;
    try {
      map.setOptions({
        center: pos,
        zoom: Math.max(map.getZoom() ?? 17, 17),
        tilt: 47,
        heading: heading ?? map.getHeading() ?? 0,
      });
    } catch {
      map.panTo(pos);
      if ((map.getZoom() ?? 0) < 16) map.setZoom(16);
    }
  };

  const emitRoute = (route: DrivingRoute | null, here: LatLng | null) => {
    if (!route) {
      onRouteRef.current?.(null);
      return;
    }
    const step: RouteStep | null = nextRouteStep(route, here);
    onRouteRef.current?.({
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      nextInstruction: step?.instruction ?? null,
      nextDistanceM: step?.distanceM ?? null,
      maneuver: step?.maneuver ?? null,
    });
  };

  const drawStopsAndRoute = () => {
    const map = mapRef.current;
    const el = wrapRef.current;
    if (!map || !window.google) return;

    const dest = destRef.current;
    const other = otherRef.current;
    const onFill = token(el, "--primary-foreground", "#fff");
    const pickupFill = token(el, "--primary", "#35ad29");
    const dropFill = token(el, "--destructive", "#e8265d");
    const destFill = destinationKind === "pickup" ? pickupFill : dropFill;
    const destLabel = destinationKind === "pickup" ? "א" : "מ";

    destMarkerRef.current?.setMap(null);
    otherMarkerRef.current?.setMap(null);
    destMarkerRef.current = dest
      ? new window.google.maps.Marker({
          position: dest,
          map,
          zIndex: 860,
          title: destinationKind === "pickup" ? "איסוף" : "מסירה",
          icon: {
            url: stopPin(destLabel, destFill, onFill),
            scaledSize: new window.google.maps.Size(36, 44),
            anchor: new window.google.maps.Point(18, 40),
          },
        })
      : null;

    if (mode === "preview" && other) {
      otherMarkerRef.current = new window.google.maps.Marker({
        position: other,
        map,
        zIndex: 850,
        title: destinationKind === "pickup" ? "מסירה" : "איסוף",
        icon: {
          url: stopPin(destinationKind === "pickup" ? "מ" : "א", destinationKind === "pickup" ? dropFill : pickupFill, onFill),
          scaledSize: new window.google.maps.Size(36, 44),
          anchor: new window.google.maps.Point(18, 40),
        },
      });
    }

    const here = fix ? { lat: fix.lat, lng: fix.lng } : null;
    const points = [here, dest, mode === "preview" ? other : null].filter(Boolean) as LatLng[];
    if (mode === "preview" && points.length >= 2) {
      const bounds = new window.google.maps.LatLngBounds();
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, { top: 48, right: 40, bottom: 48, left: 40 });
    } else if (dest && !here) {
      map.panTo(dest);
      map.setZoom(15);
    }

    if (mode === "navigate" && dest) {
      void refreshRoute(here, dest, false);
    } else if (mode === "preview" && dest) {
      const origin = here ?? other ?? dest;
      void refreshRoute(origin, dest, true);
    }
  };

  const drawPolyline = (path: LatLng[]) => {
    const map = mapRef.current;
    const el = wrapRef.current;
    if (!map || !window.google || path.length < 2) return;
    const route = token(el, "--map-route", "#1a73e8");
    const casing = token(el, "--map-route-casing", "#ffffff");
    casingRef.current?.setMap(null);
    polyRef.current?.setMap(null);
    casingRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: casing,
      strokeOpacity: 1,
      strokeWeight: 10,
      map,
      zIndex: 4,
    });
    polyRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: route,
      strokeOpacity: 1,
      strokeWeight: 6,
      map,
      zIndex: 5,
    });
  };

  const refreshRoute = async (origin: LatLng | null, dest: LatLng, overview: boolean) => {
    if (!origin) {
      routeRef.current = null;
      emitRoute(null, null);
      return;
    }
    const now = Date.now();
    const last = lastRouteOrigin.current;
    const moved = last ? haversineKm(last, origin) * 1000 : Infinity;
    if (last && moved < REROUTE_MIN_M && now - lastRouteAt.current < REROUTE_MIN_MS && routeRef.current) {
      emitRoute(routeRef.current, origin);
      return;
    }
    lastRouteOrigin.current = origin;
    lastRouteAt.current = now;
    const route = await fetchDrivingRoute(origin, dest);
    if (!route?.path.length) {
      const km = Math.round(haversineKm(origin, dest) * 10) / 10;
      const fallback: DrivingRoute = {
        path: [origin, dest],
        distanceKm: km,
        durationMin: Math.max(1, Math.round(km * 3)),
      };
      routeRef.current = fallback;
      drawPolyline(fallback.path);
      emitRoute(fallback, origin);
      return;
    }
    routeRef.current = route;
    drawPolyline(route.path);
    emitRoute(route, origin);
    if (overview && mode === "preview") {
      const map = mapRef.current;
      if (map) {
        const bounds = new window.google.maps.LatLngBounds();
        for (const p of route.path) bounds.extend(p);
        map.fitBounds(bounds, { top: 48, right: 40, bottom: 48, left: 40 });
      }
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    const el = wrapRef.current;
    if (!map || !window.google || !fix) return;
    const pos = { lat: fix.lat, lng: fix.lng };
    const puck = token(el, "--map-puck", "#1a73e8");
    const onFill = token(el, "--primary-foreground", "#fff");

    if (!haloRef.current) {
      haloRef.current = new window.google.maps.Circle({
        map,
        center: pos,
        radius: Math.min(Math.max(fix.accuracy ?? 18, 12), 40),
        fillColor: puck,
        fillOpacity: 0.16,
        strokeColor: puck,
        strokeOpacity: 0.28,
        strokeWeight: 1,
        zIndex: 8,
        clickable: false,
      });
    } else {
      haloRef.current.setCenter(pos);
      haloRef.current.setRadius(Math.min(Math.max(fix.accuracy ?? 18, 12), 40));
    }

    const heading = fix.heading;
    const icon: google.maps.Symbol = heading != null
      ? {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5.5,
          fillColor: puck,
          fillOpacity: 1,
          strokeColor: onFill,
          strokeWeight: 2.5,
          rotation: heading,
        }
      : {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: puck,
          fillOpacity: 1,
          strokeColor: onFill,
          strokeWeight: 3,
        };

    if (!puckRef.current) {
      puckRef.current = new window.google.maps.Marker({
        position: pos,
        map,
        icon,
        zIndex: 999,
        clickable: false,
      });
    } else {
      puckRef.current.setPosition(pos);
      puckRef.current.setIcon(icon);
    }

    if (mode === "navigate") followCamera(pos, heading);
    const dest = destRef.current;
    if (mode === "navigate" && dest) void refreshRoute(pos, dest, false);
    else if (routeRef.current) emitRoute(routeRef.current, pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix?.lat, fix?.lng, fix?.heading, mode]);

  const recenter = () => {
    setFollowing(true);
    followingRef.current = true;
    if (fix) followCamera({ lat: fix.lat, lng: fix.lng }, fix.heading);
  };

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden bg-map-canvas", className)}>
      {error ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-text-subtle bg-map-canvas">
          {error}
        </div>
      ) : (
        <div ref={mapDivRef} className="absolute inset-0 size-full" />
      )}
      {mode === "navigate" && (
        <button
          type="button"
          onClick={recenter}
          aria-label="מרכז עליי"
          className={cn(
            "absolute left-3 bottom-3 z-10 size-11 rounded-pill bg-surface text-text-strong shadow-card-strong border border-border grid place-items-center active:scale-95",
            !following && "ring-2 ring-primary",
          )}
        >
          {following ? <LocateFixed className="size-5 text-primary" /> : <Crosshair className="size-5" />}
        </button>
      )}
    </div>
  );
}
