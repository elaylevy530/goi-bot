import { useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { loadGoogleMaps, type SelectedPlace } from "./AddressAutocomplete";
import { fetchDrivingRoute, haversineKm, type DrivingRoute, type LatLng } from "@/lib/google-driving-route";
import { googleMapsBrowserKey } from "@/lib/google-maps-key";
import { cn } from "@/lib/utils";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  waypoints?: LatLng[];
  className?: string;
  onRoute?: (route: DrivingRoute | null) => void;
  picking?: boolean;
  onPick?: (place: SelectedPlace) => void;
  onTogglePick?: () => void;
  pickupLabel?: string;
  dropoffLabel?: string;
};

function tokenColor(el: HTMLElement | null, name: string, fallback: string) {
  if (!el) return fallback;
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

function attachHtmlMarker(map: google.maps.Map, position: LatLng, className: string, html: string) {
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = function onAdd() {
    const div = document.createElement("div");
    div.className = className;
    div.innerHTML = html;
    (this as google.maps.OverlayView & { div?: HTMLDivElement }).div = div;
    this.getPanes()?.overlayMouseTarget.appendChild(div);
  };
  overlay.draw = function draw() {
    const div = (this as google.maps.OverlayView & { div?: HTMLDivElement }).div;
    const proj = this.getProjection();
    if (!div || !proj) return;
    const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng));
    if (!p) return;
    div.style.left = `${p.x}px`;
    div.style.top = `${p.y}px`;
  };
  overlay.onRemove = function onRemove() {
    (this as google.maps.OverlayView & { div?: HTMLDivElement }).div?.remove();
  };
  overlay.setMap(map);
  return overlay;
}

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerCard(label: string, kind: "store" | "destination") {
  const [title, ...rest] = label.split(" · ");
  const sub = rest.join(" · ");
  const icon =
    kind === "store"
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  return `<span>${icon}</span><b>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</b>`;
}

export function OrderMap({ pickup, dropoff, waypoints = [], className, onRoute, picking, onPick, pickupLabel, dropoffLabel }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarker = useRef<google.maps.Marker | null>(null);
  const dropoffMarker = useRef<google.maps.Marker | null>(null);
  const stopMarkers = useRef<google.maps.Marker[]>([]);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const htmlOverlays = useRef<google.maps.OverlayView[]>([]);
  const onRouteRef = useRef(onRoute);
  const onPickRef = useRef(onPick);
  const pickupRef = useRef(pickup);
  const dropoffRef = useRef(dropoff);
  const waypointsRef = useRef(waypoints);
  onRouteRef.current = onRoute;
  onPickRef.current = onPick;
  pickupRef.current = pickup;
  dropoffRef.current = dropoff;
  waypointsRef.current = waypoints;
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(
    googleMapsBrowserKey() ? null : "חסר מפתח Google Maps בדפדפן",
  );

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new window.google.maps.Map(divRef.current, {
          center: IL_CENTER,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: { position: window.google.maps.ControlPosition.LEFT_BOTTOM },
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        setMapReady(true);
        setMapError(null);
        window.setTimeout(() => {
          if (!cancelled && mapRef.current) {
            window.google.maps.event.trigger(mapRef.current, "resize");
          }
        }, 120);
      })
      .catch((e) => {
        if (!cancelled) setMapError(e instanceof Error ? e.message : "מפת Google לא נטענה");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = divRef.current;
    const map = mapRef.current;
    if (!el || !map || !mapReady) return;
    const ro = new ResizeObserver(() => {
      window.google.maps.event.trigger(map, "resize");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const listener = map.addListener("click", (ev: google.maps.MapMouseEvent) => {
      if (!picking || !onPickRef.current || !ev.latLng) return;
      const lat = ev.latLng.lat();
      const lng = ev.latLng.lng();
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const address =
          status === "OK" && results?.[0]?.formatted_address
            ? results[0].formatted_address
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onPickRef.current?.({ address, lat, lng });
      });
    });
    map.setOptions({ draggableCursor: picking ? "crosshair" : undefined });
    return () => {
      listener.remove();
    };
  }, [mapReady, picking]);

  const waypointsKey = waypoints.map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join("|");

  useEffect(() => {
    const map = mapRef.current;
    const el = divRef.current;
    if (!map) return;
    const stops = waypointsKey
      ? waypointsKey.split("|").map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          return { lat, lng };
        })
      : [];

    const routeColor = "#087d52";
    const onColor = tokenColor(el, "--primary-foreground", "#fff");

    const clearOverlays = () => {
      pickupMarker.current?.setMap(null);
      pickupMarker.current = null;
      dropoffMarker.current?.setMap(null);
      dropoffMarker.current = null;
      for (const m of stopMarkers.current) m.setMap(null);
      stopMarkers.current = [];
      for (const o of htmlOverlays.current) o.setMap(null);
      htmlOverlays.current = [];
      polyRef.current?.setMap(null);
      polyRef.current = null;
    };

    const pin = (color: string) => ({
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: onColor,
      strokeWeight: 3,
    });

    const drawLine = (path: LatLng[], dashed: boolean) => {
      polyRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: routeColor,
        strokeOpacity: dashed ? 0 : 0.9,
        strokeWeight: dashed ? 0 : 5,
        icons: dashed
          ? [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3, strokeColor: routeColor },
                offset: "0",
                repeat: "12px",
              },
            ]
          : undefined,
        map,
      });
    };

    clearOverlays();

    if (pickup) {
      htmlOverlays.current.push(
        attachHtmlMarker(map, pickup, "map-marker store-marker", markerCard(pickupLabel || "איסוף", "store")),
      );
    }
    if (dropoff) {
      htmlOverlays.current.push(
        attachHtmlMarker(map, dropoff, "map-marker", markerCard(dropoffLabel || "מסירה", "destination")),
      );
    }
    for (const wp of stops) {
      stopMarkers.current.push(
        new window.google.maps.Marker({
          position: wp,
          map,
          icon: pin(tokenColor(el, "--text-muted", routeColor)),
          title: "יעד ביניים",
          zIndex: 2,
        }),
      );
    }

    let cancelled = false;

    const fit = (points: LatLng[]) => {
      if (points.length === 0) return;
      if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(15);
        return;
      }
      const bounds = new window.google.maps.LatLngBounds();
      for (const p of points) bounds.extend(p);
      map.fitBounds(bounds, 72);
    };

    if (pickup && dropoff) {
      const origin = { lat: pickup.lat, lng: pickup.lng };
      const dest = { lat: dropoff.lat, lng: dropoff.lng };
      drawLine([origin, dest], true);
      fit([origin, ...stops, dest]);

      void fetchDrivingRoute(origin, dest, stops).then((route) => {
        if (cancelled) return;
        if (!route?.path.length) {
          onRouteRef.current?.({
            path: [origin, dest],
            distanceKm: Math.round(haversineKm(origin, dest) * 10) / 10,
            durationMin: Math.max(1, Math.round(haversineKm(origin, dest) * 3)),
          });
          return;
        }
        polyRef.current?.setMap(null);
        drawLine(route.path, false);
        fit(route.path);
        onRouteRef.current?.(route);
      });
    } else {
      onRouteRef.current?.(null);
      if (pickup) fit([{ lat: pickup.lat, lng: pickup.lng }]);
      else if (dropoff) fit([{ lat: dropoff.lat, lng: dropoff.lng }]);
    }

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff, waypointsKey, mapReady, pickupLabel, dropoffLabel]);

  const bumpZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + delta);
  };

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const points: LatLng[] = [];
    if (pickupRef.current) points.push({ lat: pickupRef.current.lat, lng: pickupRef.current.lng });
    if (dropoffRef.current) points.push({ lat: dropoffRef.current.lat, lng: dropoffRef.current.lng });
    for (const w of waypointsRef.current) points.push(w);
    if (points.length === 0) {
      map.panTo(IL_CENTER);
      map.setZoom(12);
      return;
    }
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 72);
  };

  return (
    <div className={cn("goi-map relative h-full w-full", className)}>
      <div ref={divRef} className="h-full w-full" style={{ minHeight: "100%" }} />
      {mapError && (
        <div className="map-error">
          {mapError}. בדקו את מפתח Google Maps בהגדרות הפריסה.
        </div>
      )}
      <div className="map-controls">
        <button type="button" aria-label="מרכז את המפה" onClick={recenter}>
          <LocateFixed size={20} />
        </button>
        <div>
          <button type="button" aria-label="הגדל" onClick={() => bumpZoom(1)}>
            <Plus size={21} />
          </button>
          <button type="button" aria-label="הקטן" onClick={() => bumpZoom(-1)}>
            <Minus size={21} />
          </button>
        </div>
      </div>
    </div>
  );
}
