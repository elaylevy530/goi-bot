import { useEffect, useRef } from "react";
import { loadGoogleMaps, type SelectedPlace } from "./AddressAutocomplete";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

export type MunchMapPin = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
};

type Props = {
  pins: MunchMapPin[];
  selectedId?: string | null;
  dropoff?: SelectedPlace | null;
  onPinClick?: (id: string) => void;
  className?: string;
};

// Munch map style — soft violet neutrals to match purple brand
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "geometry", stylers: [{ color: "#F6F3FB" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3F2A6B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#E7DEF8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#C9B8F0" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#EFE9FA" }] },
];

export function MunchMap({ pins, selectedId, dropoff, onPinClick, className }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const dropoffMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !divRef.current || mapRef.current) return;
      mapRef.current = new window.google.maps.Map(divRef.current, {
        center: IL_CENTER,
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        clickableIcons: false,
        styles: MAP_STYLE,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // sync pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    // remove stale
    for (const [id, m] of existing) {
      if (!pins.find((p) => p.id === id)) { m.setMap(null); existing.delete(id); }
    }
    // add / update
    pins.forEach((p) => {
      const isSel = p.id === selectedId;
      const icon: google.maps.Symbol = {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: isSel ? 14 : 10,
        fillColor: isSel ? "#7c3aed" : "#a78bfa",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: isSel ? 4 : 3,
      };
      let m = existing.get(p.id);
      if (!m) {
        m = new window.google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          icon,
          title: p.label,
          zIndex: isSel ? 999 : 1,
        });
        m.addListener("click", () => onPinClick?.(p.id));
        existing.set(p.id, m);
      } else {
        m.setPosition({ lat: p.lat, lng: p.lng });
        m.setIcon(icon);
        m.setZIndex(isSel ? 999 : 1);
      }
    });

    // fit bounds
    const positions: google.maps.LatLngLiteral[] = [];
    if (selectedId) {
      const sel = pins.find((p) => p.id === selectedId);
      if (sel) positions.push({ lat: sel.lat, lng: sel.lng });
    } else {
      pins.forEach((p) => positions.push({ lat: p.lat, lng: p.lng }));
    }
    if (dropoff) positions.push({ lat: dropoff.lat, lng: dropoff.lng });

    if (positions.length === 1) {
      map.panTo(positions[0]);
      map.setZoom(15);
    } else if (positions.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      positions.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [pins, selectedId, dropoff, onPinClick]);

  // dropoff marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (dropoffMarkerRef.current) { dropoffMarkerRef.current.setMap(null); dropoffMarkerRef.current = null; }
    if (dropoff) {
      dropoffMarkerRef.current = new window.google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#DC2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "כתובת משלוח",
      });
    }
  }, [dropoff]);

  return <div ref={divRef} className={className ?? "w-full h-full"} />;
}
