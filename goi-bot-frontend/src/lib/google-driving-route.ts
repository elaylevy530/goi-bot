export type LatLng = { lat: number; lng: number };

export type DrivingRoute = {
  path: LatLng[];
  distanceKm: number;
  durationMin: number;
};

/** Round coords so tiny GPS jitter doesn't spam Directions. */
export function routeCacheKey(origin: LatLng, destination: LatLng): string {
  const r = (n: number) => n.toFixed(4); // ~11m
  return `${r(origin.lat)},${r(origin.lng)}>${r(destination.lat)},${r(destination.lng)}`;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Next navigation leg for the courier's current stage. */
export function nextLegEndpoints(input: {
  pickedUp: boolean;
  delivered: boolean;
  myPos: LatLng | null;
  pickup: LatLng | null;
  drop: LatLng | null;
}): { origin: LatLng; destination: LatLng } | null {
  const { pickedUp, delivered, myPos, pickup, drop } = input;
  if (delivered) {
    if (pickup && drop) return { origin: pickup, destination: drop };
    return null;
  }
  if (!pickedUp) {
    if (myPos && pickup) return { origin: myPos, destination: pickup };
    if (pickup && drop) return { origin: pickup, destination: drop };
    return null;
  }
  if (myPos && drop) return { origin: myPos, destination: drop };
  if (pickup && drop) return { origin: pickup, destination: drop };
  return null;
}

export async function fetchDrivingRoute(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[] = [],
): Promise<DrivingRoute | null> {
  if (typeof window === "undefined" || !window.google?.maps) return null;

  try {
    if (window.google.maps.importLibrary) {
      await window.google.maps.importLibrary("routes");
    }
  } catch {
    // Classic Maps bundle may already expose DirectionsService.
  }

  if (typeof window.google.maps.DirectionsService !== "function") return null;

  const service = new window.google.maps.DirectionsService();
  const result = await new Promise<google.maps.DirectionsResult | null>((resolve) => {
    service.route(
      {
        origin,
        destination,
        waypoints: waypoints.map((p) => ({ location: p, stopover: true })),
        travelMode: window.google.maps.TravelMode.DRIVING,
        region: "il",
        provideRouteAlternatives: false,
      },
      (res, status) => {
        resolve(status === "OK" && res ? res : null);
      },
    );
  });

  const route = result?.routes?.[0];
  const legs = route?.legs;
  const overview = route?.overview_path;
  if (!legs?.length || !overview?.length) return null;

  const meters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
  const seconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);

  return {
    path: overview.map((p) => ({ lat: p.lat(), lng: p.lng() })),
    distanceKm: Math.round((meters / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round(seconds / 60)),
  };
}
