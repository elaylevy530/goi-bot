import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, type SelectedPlace } from "./AddressAutocomplete";
import { fetchDrivingRoute, haversineKm, type DrivingRoute, type LatLng } from "@/lib/google-driving-route";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  waypoints?: LatLng[];
  className?: string;
  onRoute?: (route: DrivingRoute | null) => void;
};

function tokenColor(el: HTMLElement | null, name: string, fallback: string) {
  if (!el) return fallback;
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || fallback;
}

export function OrderMap({ pickup, dropoff, waypoints = [], className, onRoute }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarker = useRef<google.maps.Marker | null>(null);
  const dropoffMarker = useRef<google.maps.Marker | null>(null);
  const stopMarkers = useRef<google.maps.Marker[]>([]);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new window.google.maps.Map(divRef.current, {
          center: IL_CENTER,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
        setMapReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

    const pickupColor = tokenColor(el, "--success", tokenColor(el, "--brand-green", ""));
    const dropoffColor = tokenColor(el, "--destructive", "");
    const routeColor = tokenColor(el, "--navy", tokenColor(el, "--text-strong", ""));
    const onColor = tokenColor(el, "--primary-foreground", "#fff");

    const clearOverlays = () => {
      pickupMarker.current?.setMap(null);
      pickupMarker.current = null;
      dropoffMarker.current?.setMap(null);
      dropoffMarker.current = null;
      for (const m of stopMarkers.current) m.setMap(null);
      stopMarkers.current = [];
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
        strokeWeight: dashed ? 0 : 4,
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
      pickupMarker.current = new window.google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map,
        icon: pin(pickupColor),
        title: "איסוף",
        zIndex: 3,
      });
    }
    if (dropoff) {
      dropoffMarker.current = new window.google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map,
        icon: pin(dropoffColor),
        title: "מסירה",
        zIndex: 3,
      });
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
  }, [pickup, dropoff, waypointsKey, mapReady]);

  return <div ref={divRef} className={className ?? "h-full w-full bg-map-canvas"} />;
}
