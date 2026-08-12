import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

type NestJobCoords = {
  id: string;
  pickup_address?: string | null;
  pickup_area?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
};

async function geocodeOne(
  address: string,
  lovableKey: string,
  mapsKey: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=il&language=iw`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );
    if (!res.ok) return null;
    const data: { results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> } =
      await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/**
 * Geocode job pickup/dropoff addresses and persist lat/lng via Nest PATCH.
 * Best-effort: missing API keys or geocode failures return `{ ok:false }` without throwing.
 */
export const geocodeJob = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((input: { jobId: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; patched?: Record<string, number> }> => {
    const job = await nestServerFetch<NestJobCoords>(`/api/jobs/${data.jobId}`, {
      accessToken: context.accessToken,
    });

    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      return { ok: false };
    }

    const pickupAddr = (job.pickup_address || job.pickup_area || "").trim();
    const dropoffAddr = (job.dropoff_address || job.dropoff_area || "").trim();
    const patch: Record<string, number> = {};

    const needPickup = job.pickup_lat == null || job.pickup_lng == null;
    const needDropoff = job.dropoff_lat == null || job.dropoff_lng == null;

    if (needPickup && pickupAddr) {
      const coords = await geocodeOne(pickupAddr, lovableKey, mapsKey);
      if (coords) {
        patch.pickup_lat = coords.lat;
        patch.pickup_lng = coords.lng;
      }
    }
    if (needDropoff && dropoffAddr) {
      const coords = await geocodeOne(dropoffAddr, lovableKey, mapsKey);
      if (coords) {
        patch.dropoff_lat = coords.lat;
        patch.dropoff_lng = coords.lng;
      }
    }

    if (!Object.keys(patch).length) {
      return { ok: false };
    }

    await nestServerFetch(`/api/jobs/${data.jobId}`, {
      method: "PATCH",
      accessToken: context.accessToken,
      body: patch,
    });
    return { ok: true, patched: patch };
  });
