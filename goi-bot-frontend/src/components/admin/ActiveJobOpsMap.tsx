/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import type { NearbyCourier } from "@/lib/active-jobs";
import type { LatLng } from "@/lib/google-driving-route";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

declare global {
  interface Window {
    __initActiveJobOpsMap?: () => void;
  }
}

type Props = {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  couriers: NearbyCourier[];
  className?: string;
};

export function ActiveJobOpsMap({ pickup, dropoff, couriers, className }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!BROWSER_KEY) {
      setError("מפתח Google Maps לא מוגדר");
      return;
    }
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    window.__initActiveJobOpsMap = () => setReady(true);
    if (document.querySelector("script[src*='maps.googleapis.com/maps/api/js']")) {
      const wait = () => (window.google?.maps ? setReady(true) : setTimeout(wait, 80));
      wait();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initActiveJobOpsMap${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.onerror = () => setError("טעינת המפה נכשלה");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !divRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(divRef.current, {
      center: pickup ?? DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
  }, [ready, pickup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;

    const add = (pos: LatLng, opts: google.maps.MarkerOptions) => {
      const marker = new window.google.maps.Marker({ ...opts, position: pos, map });
      markersRef.current.push(marker);
      bounds.extend(pos);
      hasPoint = true;
    };

    if (pickup) {
      add(pickup, {
        title: "איסוף",
        label: { text: "א", color: "#fff", fontWeight: "700", fontSize: "12px" },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#1e6cf2",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 800,
      });
    }
    if (dropoff) {
      add(dropoff, {
        title: "מסירה",
        label: { text: "מ", color: "#fff", fontWeight: "700", fontSize: "12px" },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#35AD29",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        zIndex: 800,
      });
    }
    for (const c of couriers) {
      add(
        { lat: c.last_lat, lng: c.last_lng },
        {
          title: `${c.full_name} · ${c.distanceKm} ק״מ`,
          label: { text: "🛵", fontSize: "16px" },
          zIndex: 600,
        },
      );
    }

    if (hasPoint) {
      if (markersRef.current.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 56);
      }
    }
  }, [pickup, dropoff, couriers, ready]);

  if (error) {
    return (
      <div className={`grid place-items-center bg-muted text-sm text-muted-foreground ${className ?? ""}`}>
        {error}
      </div>
    );
  }

  return <div ref={divRef} className={className ?? "w-full h-full min-h-[280px]"} />;
}
