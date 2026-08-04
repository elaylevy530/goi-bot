/// <reference types="google.maps" />
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, MapPin, Bike } from "lucide-react";

export const Route = createFileRoute("/_authenticated/couriers-map")({
  component: CouriersMapPage,
});

const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

// Default center: Israel (Tel Aviv)
const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 };

declare global {
  interface Window {
    google: typeof google;
    __initCouriersMap?: () => void;
  }
}

function minutesAgo(iso: string | null) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} ד׳`;
  return `לפני ${Math.floor(m / 60)} ש׳`;
}

function useActiveCouriers() {
  return useQuery({
    queryKey: ["active-couriers-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couriers")
        .select("id, full_name, whatsapp_phone, vehicle_type, courier_status, last_lat, last_lng, last_location_at")
        .eq("courier_status", "פעיל")
        .not("last_lat", "is", null)
        .not("last_lng", "is", null);
      if (error) throw error;
      // Only show fresh pings (last 30 minutes)
      const cutoff = Date.now() - 30 * 60 * 1000;
      return (data ?? []).filter(
        (c) => c.last_location_at && new Date(c.last_location_at).getTime() > cutoff
      );
    },
    refetchInterval: 20_000,
  });
}

function CouriersMapPage() {
  const { data: couriers = [], refetch, isFetching } = useActiveCouriers();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Load Google Maps JS
  useEffect(() => {
    if (!BROWSER_KEY) {
      setMapError("מפתח Google Maps לא הוגדר");
      return;
    }
    if (window.google?.maps) {
      setReady(true);
      return;
    }
    window.__initCouriersMap = () => setReady(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&loading=async&callback=__initCouriersMap${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    script.async = true;
    script.onerror = () => setMapError("טעינת המפה נכשלה");
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [ready]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (!couriers.length) return;

    const bounds = new window.google.maps.LatLngBounds();
    couriers.forEach((c) => {
      if (c.last_lat == null || c.last_lng == null) return;
      const pos = { lat: Number(c.last_lat), lng: Number(c.last_lng) };
      const marker = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current!,
        title: c.full_name ?? "שליח",
        label: { text: "🛵", fontSize: "18px" },
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div dir="rtl" style="font-family:inherit;min-width:160px">
          <div style="font-weight:600">${c.full_name ?? "שליח"}</div>
          <div style="font-size:12px;color:#666">${c.vehicle_type ?? ""}</div>
          <div style="font-size:12px;color:#888;margin-top:4px">${minutesAgo(c.last_location_at)}</div>
        </div>`,
      });
      marker.addListener("click", () => info.open({ map: mapRef.current!, anchor: marker }));
      markersRef.current.push(marker);
      bounds.extend(pos);
    });
    if (couriers.length > 1) mapRef.current.fitBounds(bounds, 60);
    else if (couriers.length === 1) mapRef.current.setZoom(13);
  }, [couriers]);

  return (
    <AdminLayout title="מפת שליחים פעילים">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="size-6 text-primary" />
              מפת שליחים פעילים
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {couriers.length} שליחים פעילים משדרים מיקום עכשיו
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            רענן
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {mapError ? (
                <div className="aspect-[4/3] flex items-center justify-center text-muted-foreground bg-muted">
                  {mapError}
                </div>
              ) : (
                <div ref={mapDivRef} className="w-full h-[70vh] min-h-[400px]" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bike className="size-4" />
                שליחים ברשת
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
              {couriers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  אין שליחים פעילים עם מיקום בזמן אמת
                </p>
              )}
              {couriers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.last_lat != null && c.last_lng != null && mapRef.current) {
                      mapRef.current.panTo({ lat: Number(c.last_lat), lng: Number(c.last_lng) });
                      mapRef.current.setZoom(14);
                    }
                  }}
                  className="w-full text-right p-3 rounded-lg border hover:bg-muted/50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.full_name ?? "שליח"}</span>
                    <Badge variant="secondary" className="text-[10px]">{c.vehicle_type ?? "—"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {minutesAgo(c.last_location_at)}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
