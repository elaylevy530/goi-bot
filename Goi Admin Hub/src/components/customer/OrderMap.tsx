import { useEffect, useRef } from "react";
import { loadGoogleMaps, type SelectedPlace } from "./AddressAutocomplete";

const IL_CENTER = { lat: 32.0853, lng: 34.7818 };

type Props = {
  pickup: SelectedPlace | null;
  dropoff: SelectedPlace | null;
  className?: string;
};

export function OrderMap({ pickup, dropoff, className }: Props) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarker = useRef<google.maps.Marker | null>(null);
  const dropoffMarker = useRef<google.maps.Marker | null>(null);
  const polyRef = useRef<google.maps.Polyline | null>(null);

  // init
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
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
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // update markers + fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickupMarker.current) { pickupMarker.current.setMap(null); pickupMarker.current = null; }
    if (dropoffMarker.current) { dropoffMarker.current.setMap(null); dropoffMarker.current = null; }
    if (polyRef.current) { polyRef.current.setMap(null); polyRef.current = null; }

    const pin = (color: string) => ({
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    });

    if (pickup) {
      pickupMarker.current = new window.google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map,
        icon: pin("#0E7A4A"),
        title: "איסוף",
      });
    }
    if (dropoff) {
      dropoffMarker.current = new window.google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map,
        icon: pin("#DC2626"),
        title: "מסירה",
      });
    }

    if (pickup && dropoff) {
      polyRef.current = new window.google.maps.Polyline({
        path: [
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng },
        ],
        geodesic: true,
        strokeColor: "#101418",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        map,
      });
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      bounds.extend({ lat: dropoff.lat, lng: dropoff.lng });
      map.fitBounds(bounds, 80);
    } else if (pickup) {
      map.panTo({ lat: pickup.lat, lng: pickup.lng });
      map.setZoom(15);
    } else if (dropoff) {
      map.panTo({ lat: dropoff.lat, lng: dropoff.lng });
      map.setZoom(15);
    }
  }, [pickup, dropoff]);

  return <div ref={divRef} className={className ?? "w-full h-full"} />;
}
