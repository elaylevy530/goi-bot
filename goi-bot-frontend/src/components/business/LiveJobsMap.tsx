import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { loadGoogleMaps } from "@/components/customer/AddressAutocomplete";
import type { LiveMapPin } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pins: LiveMapPin[];
  className?: string;
  showControls?: boolean;
  selectedId?: string;
  onMarker?: (id: string) => void;
};

function pinFill(pin: LiveMapPin, fallback: string) {
  if (pin.color) return pin.color;
  if (pin.type === "store") return "#00a334";
  if (pin.type === "destination") return "#b38235";
  return fallback;
}

export function LiveJobsMap({ pins, className, showControls, selectedId, onMarker }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const onMarkerRef = useRef(onMarker);
  const [mapReady, setMapReady] = useState(false);
  onMarkerRef.current = onMarker;

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
            { featureType: "water", stylers: [{ color: "#dce8e1" }] },
            { featureType: "landscape", stylers: [{ color: "#eef4f0" }] },
            { featureType: "road", stylers: [{ color: "#ffffff" }] },
          ],
        });
        setMapReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showControls]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps || !mapReady) return;
    const fallback = "#087d52";

    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = [];

    if (pins.length === 0) {
      map.setCenter(IL_CENTER);
      map.setZoom(11);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    for (const pin of pins) {
      const selected = selectedId === pin.id;
      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        title: pin.label,
        zIndex: selected ? 20 : pin.type === "store" ? 15 : 5,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: pin.type === "store" ? 14 : selected ? 12 : 10,
          fillColor: pinFill(pin, fallback),
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: selected ? 4 : 3,
        },
      });
      marker.addListener("click", () => onMarkerRef.current?.(pin.id));
      markersRef.current.push(marker);
      bounds.extend({ lat: pin.lat, lng: pin.lng });
    }
    const focused = pins.find((p) => p.id === selectedId);
    if (focused) {
      map.panTo({ lat: focused.lat, lng: focused.lng });
      map.setZoom(Math.max(map.getZoom() ?? 14, 14));
      return;
    }
    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, 48);
    }
  }, [pins, selectedId, mapReady]);

  const bumpZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + delta);
  };

  return (
    <div className={cn("goi-map relative h-full min-h-[16rem] w-full", className)}>
      <div
        ref={divRef}
        className="h-full min-h-[16rem] w-full"
        role="img"
        aria-label="מפת משלוחים"
      />
      {showControls && (
        <div className="map-controls">
          <div>
            <button type="button" onClick={() => bumpZoom(1)} aria-label="הגדל">
              <Plus className="size-4" />
            </button>
            <button type="button" onClick={() => bumpZoom(-1)} aria-label="הקטן">
              <Minus className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
