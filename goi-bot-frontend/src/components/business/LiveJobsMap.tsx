import { useEffect, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { loadGoogleMaps } from "@/components/customer/AddressAutocomplete";
import type { LiveMapPin } from "@/lib/business-panel";
import { googleMapsBrowserKey } from "@/lib/google-maps-key";
import { cn } from "@/lib/utils";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pins: LiveMapPin[];
  className?: string;
  showControls?: boolean;
  selectedId?: string;
  onMarker?: (id: string) => void;
};

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attachHtmlMarker(map: google.maps.Map, pin: LiveMapPin, onClick?: (id: string) => void) {
  const overlay = new google.maps.OverlayView();
  overlay.onAdd = function onAdd() {
    const div = document.createElement("div");
    const kind = pin.type === "store" ? "store-marker" : pin.type === "courier" ? "courier-marker" : "";
    div.className = `map-marker ${kind}`.trim();
    if (pin.color) div.style.setProperty("--marker-color", pin.color);
    const icon =
      pin.type === "store"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`
        : pin.type === "courier"
          ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3"/></svg>`
          : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    div.innerHTML = `<span>${icon}</span><b>${esc(pin.label)}</b>`;
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick?.(pin.id);
    });
    (this as google.maps.OverlayView & { div?: HTMLDivElement }).div = div;
    this.getPanes()?.overlayMouseTarget.appendChild(div);
  };
  overlay.draw = function draw() {
    const div = (this as google.maps.OverlayView & { div?: HTMLDivElement }).div;
    const proj = this.getProjection();
    if (!div || !proj) return;
    const p = proj.fromLatLngToDivPixel(new google.maps.LatLng(pin.lat, pin.lng));
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

export function LiveJobsMap({ pins, className, showControls, selectedId, onMarker }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<google.maps.OverlayView[]>([]);
  const onMarkerRef = useRef(onMarker);
  const pinsRef = useRef(pins);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(
    googleMapsBrowserKey() ? null : "חסר מפתח Google Maps בדפדפן",
  );
  onMarkerRef.current = onMarker;
  pinsRef.current = pins;

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
    if (!map || !window.google?.maps || !mapReady) return;

    for (const overlay of overlaysRef.current) overlay.setMap(null);
    overlaysRef.current = [];

    if (pins.length === 0) {
      map.setCenter(IL_CENTER);
      map.setZoom(11);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    for (const pin of pins) {
      overlaysRef.current.push(attachHtmlMarker(map, pin, (id) => onMarkerRef.current?.(id)));
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
      map.fitBounds(bounds, 56);
    }
  }, [pins, selectedId, mapReady]);

  const bumpZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom((map.getZoom() ?? 12) + delta);
  };

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const current = pinsRef.current;
    if (current.length === 0) {
      map.panTo(IL_CENTER);
      map.setZoom(12);
      return;
    }
    if (current.length === 1) {
      map.panTo({ lat: current[0].lat, lng: current[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    for (const p of current) bounds.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(bounds, 56);
  };

  return (
    <div className={cn("goi-map relative h-full min-h-[16rem] w-full", className)}>
      <div
        ref={divRef}
        className="h-full min-h-[16rem] w-full"
        role="img"
        aria-label="מפת משלוחים"
      />
      {mapError && <div className="map-error">{mapError}. בדקו את מפתח Google Maps בהגדרות הפריסה.</div>}
      {showControls && (
        <div className="map-controls">
          <button type="button" aria-label="מרכז את המפה" onClick={recenter}>
            <LocateFixed size={20} />
          </button>
          <div>
            <button type="button" onClick={() => bumpZoom(1)} aria-label="הגדל">
              <Plus size={21} />
            </button>
            <button type="button" onClick={() => bumpZoom(-1)} aria-label="הקטן">
              <Minus size={21} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
