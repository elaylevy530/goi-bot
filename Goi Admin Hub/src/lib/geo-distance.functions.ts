import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

async function geocode(address: string, lovableKey: string, mapsKey: string) {
  let res: Response;
  try {
    res = await fetch(
      `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=il&language=iw`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey } },
    );
  } catch (e) {
    throw new Error("GEOCODE_NETWORK");
  }
  if (!res.ok) throw new Error(`geocode HTTP ${res.status}`);
  const data: any = await res.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) throw new Error("address not found");
  return { lat: loc.lat as number, lng: loc.lng as number };
}


export const computeDeliveryDistance = createServerFn({ method: "POST" })
  .inputValidator((input: { origin: string; destination: string }) => input)
  .handler(async ({ data }): Promise<{ distance_km: number | null; source: "routes" | "haversine" | "fallback"; error?: string }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) throw new Error("Maps connector not configured");
    if (!data.origin?.trim() || !data.destination?.trim()) {
      throw new Error("origin and destination required");
    }

    let o: { lat: number; lng: number };
    let d: { lat: number; lng: number };
    try {
      [o, d] = await Promise.all([
        geocode(data.origin, lovableKey, mapsKey),
        geocode(data.destination, lovableKey, mapsKey),
      ]);
    } catch (e: any) {
      console.error("geocode failed", e?.message);
      return { distance_km: null, source: "fallback", error: "SERVICE_UNAVAILABLE" };
    }

    // Routes API — computeRoutes for driving distance
    let routesRes: Response | null = null;
    try {
      routesRes = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: o.lat, longitude: o.lng } } },
          destination: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      });
    } catch (e: any) {
      console.error("routes fetch failed", e?.message);
    }

    if (routesRes && routesRes.ok) {

      const rd: any = await routesRes.json();
      const meters = rd?.routes?.[0]?.distanceMeters;
      if (typeof meters === "number") {
        return { distance_km: Math.round((meters / 1000) * 10) / 10, source: "routes" as const };
      }
    }

    // Haversine fallback
    const R = 6371;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(d.lat - o.lat);
    const dLng = toRad(d.lng - o.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(o.lat)) * Math.cos(toRad(d.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    // Approximate driving distance with 1.3x detour factor
    return { distance_km: Math.round(km * 1.3 * 10) / 10, source: "haversine" as const };
  });
