import { createServerFn } from "@tanstack/react-start";

/**
 * Geocode a job's pickup and dropoff addresses and write lat/lng to the row.
 * Fire-and-forget from the client right after job insert so GPS matching works
 * from the moment the job exists.
 */
export const geocodeJob = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; patched?: Record<string, number> }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("id, pickup_address, pickup_area, pickup_lat, pickup_lng, dropoff_address, dropoff_area, dropoff_lat, dropoff_lng")
      .eq("id", data.jobId)
      .maybeSingle();
    if (error || !job) return { ok: false };

    const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
    const geocode = async (addr: string) => {
      try {
        const r = await fetch(
          `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(addr)}&region=il&language=iw`,
          { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey } },
        );
        if (!r.ok) return null;
        const d: any = await r.json();
        const loc = d?.results?.[0]?.geometry?.location;
        return loc ? { lat: Number(loc.lat), lng: Number(loc.lng) } : null;
      } catch { return null; }
    };

    const patch: Record<string, number> = {};
    const pickupAddr = [job.pickup_address, job.pickup_area].filter(Boolean).join(", ").trim();
    if ((job.pickup_lat == null || job.pickup_lng == null) && pickupAddr) {
      const r = await geocode(pickupAddr);
      if (r) { patch.pickup_lat = r.lat; patch.pickup_lng = r.lng; }
    }
    const dropAddr = [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ").trim();
    if ((job.dropoff_lat == null || job.dropoff_lng == null) && dropAddr) {
      const r = await geocode(dropAddr);
      if (r) { patch.dropoff_lat = r.lat; patch.dropoff_lng = r.lng; }
    }

    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from("jobs").update(patch as any).eq("id", job.id);
      return { ok: true, patched: patch };
    }
    return { ok: true };
  });
