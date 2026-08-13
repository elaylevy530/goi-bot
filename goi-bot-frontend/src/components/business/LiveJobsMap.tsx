import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/components/customer/AddressAutocomplete";
import type { LiveMapPin } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pins: LiveMapPin[];
  className?: string;
};

export function LiveJobsMap({ pins, className }: Props) {
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
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

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
          fillColor: "#35ad29",
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

  return (
    <div
      ref={divRef}
      className={cn("h-full min-h-[16rem] w-full bg-muted", className)}
      role="img"
      aria-label="מפת שליחים"
    />
  );
}
