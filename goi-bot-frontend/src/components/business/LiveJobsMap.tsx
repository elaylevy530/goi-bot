import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { loadGoogleMaps } from "@/components/customer/AddressAutocomplete";
import type { LiveMapPin } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pins: LiveMapPin[];
  className?: string;
  showControls?: boolean;
};

function pinColor(el: HTMLElement | null) {
  if (!el) return "#2979ff";
  const value = getComputedStyle(el).getPropertyValue("--primary").trim();
  return value || "#2979ff";
}

export function LiveJobsMap({ pins, className, showControls }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new window.google.maps.Map(divRef.current, {
          center: IL_CENTER,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: !showControls,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            { featureType: "water", stylers: [{ color: "#e2e8f0" }] },
            { featureType: "landscape", stylers: [{ color: "#f1f5f9" }] },
            { featureType: "road", stylers: [{ color: "#ffffff" }] },
          ],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showControls]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const fill = pinColor(divRef.current);

    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = [];

    if (pins.length === 0) {
      map.setCenter(IL_CENTER);
      map.setZoom(11);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    for (const pin of pins) {
      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        title: pin.label,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    }
    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 48);
    }
  }, [pins]);

  const bumpZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + delta);
  };

  return (
    <div className={cn("relative h-full min-h-[16rem] w-full bg-map-canvas", className)}>
      <div
        ref={divRef}
        className="h-full min-h-[16rem] w-full bg-map-canvas"
        role="img"
        aria-label="מפת שליחים"
      />
      {showControls && (
        <div className="absolute start-4 top-4 z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-kpi">
          <button
            type="button"
            onClick={() => bumpZoom(1)}
            className="grid size-8 place-items-center text-text-strong hover:bg-muted"
            aria-label="הגדל"
          >
            <Plus className="size-4" />
          </button>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => bumpZoom(-1)}
            className="grid size-8 place-items-center text-text-strong hover:bg-muted"
            aria-label="הקטן"
          >
            <Minus className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
