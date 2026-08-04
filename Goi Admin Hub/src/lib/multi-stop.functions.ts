import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const stopSchema = z.object({
  tempId: z.string(),
  stop_type: z.enum(["pickup", "dropoff"]),
  linked_pickup_tempId: z.string().nullable().optional(),
  address: z.string().min(1).max(300),
  area: z.string().max(120).optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  contact_name: z.string().max(120).optional().nullable(),
  contact_phone: z.string().max(40).optional().nullable(),
  package_description: z.string().max(500).optional().nullable(),
  package_size: z.string().max(40).optional().nullable(),
  number_of_packages: z.number().int().min(1).max(50).optional().nullable(),
  fragile: z.boolean().optional().nullable(),
});

export const createMultiStopJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        stops: z.array(stopSchema).min(2).max(12),
        vehicle_required: z.string().optional().nullable(),
        when: z
          .object({
            mode: z.enum(["now", "scheduled"]).default("now"),
            job_date: z.string().optional().nullable(),
            job_time: z.string().optional().nullable(),
          })
          .default({ mode: "now" }),
        notes: z.string().max(1000).optional().nullable(),
        payment: z.number().nonnegative().optional().nullable(),
        pricing_type: z.enum(["fixed_price", "distance_based", "quote_request"]).default("fixed_price"),
        base_price: z.number().nonnegative().optional().nullable(),
        price_per_km: z.number().nonnegative().optional().nullable(),
        auto_optimize: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find business
    const { data: biz, error: bizErr } = await supabase
      .from("customers")
      .select("id, name, business_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (bizErr) throw new Error(bizErr.message);
    if (!biz) throw new Error("עסק לא נמצא");

    const pickups = data.stops.filter((s) => s.stop_type === "pickup");
    const dropoffs = data.stops.filter((s) => s.stop_type === "dropoff");
    if (pickups.length === 0 || dropoffs.length === 0) {
      throw new Error("חייבים לפחות איסוף אחד ומסירה אחת");
    }

    // Distance estimate (haversine through the order given)
    const totalKm = estimateRouteKm(data.stops);
    const base = Number(data.base_price) || 0;
    const perKm = Number(data.price_per_km) || 0;
    const distancePrice = data.pricing_type === "distance_based"
      ? Math.round((base + perKm * totalKm) * 100) / 100
      : 0;
    const fallbackPrice = Math.max(40, Math.round(30 + data.stops.length * 8 + totalKm * 3));
    const payment =
      data.pricing_type === "quote_request"
        ? 0
        : data.pricing_type === "distance_based"
          ? distancePrice
          : (data.payment != null ? data.payment : fallbackPrice);

    const firstPickup = pickups[0];
    const firstDrop = dropoffs[0];

    // Create the parent job
    const { data: job, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert({
        customer_id: biz.id,
        customer_name: biz.business_name || biz.name,
        job_type: "מרובה נקודות",
        pricing_type: data.pricing_type,
        matching_model: data.pricing_type,
        is_multi_stop: true,
        stops_count: data.stops.length,
        total_distance_km: totalKm,
        estimated_distance_km: totalKm,
        base_price: data.pricing_type === "distance_based" ? base : null,
        price_per_km: data.pricing_type === "distance_based" ? perKm : null,
        pickup_address: firstPickup.address,
        pickup_area: firstPickup.area ?? null,
        pickup_lat: firstPickup.lat ?? null,
        pickup_lng: firstPickup.lng ?? null,
        dropoff_address: dropoffs.length === 1 ? firstDrop.address : `${dropoffs.length} נקודות מסירה`,
        dropoff_area: firstDrop.area ?? null,
        dropoff_lat: firstDrop.lat ?? null,
        dropoff_lng: firstDrop.lng ?? null,
        vehicle_required: data.vehicle_required ?? null,
        description: data.notes ?? null,
        payment,
        customer_price: payment,
        suggested_courier_payment: payment,
        job_date:
          data.when.mode === "scheduled"
            ? data.when.job_date ?? new Date().toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        job_time: data.when.mode === "scheduled" ? data.when.job_time ?? null : null,
        status: "טיוטה",
        package_type: "מרובה נקודות",
        number_of_packages: pickups.reduce(
          (sum, p) => sum + (p.number_of_packages || 1),
          0,
        ),
      } as never)
      .select("id, job_number")
      .single();
    if (jobErr || !job) throw new Error(jobErr?.message || "שגיאה ביצירת הזמנה");

    // Insert all stops, mapping linked_pickup_tempId -> real UUID
    const stopRows = data.stops.map((s, i) => ({
      tempId: s.tempId,
      row: {
        job_id: job.id,
        stop_order: i + 1,
        stop_type: s.stop_type,
        address: s.address,
        area: s.area ?? null,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        contact_name: s.contact_name ?? null,
        contact_phone: s.contact_phone ?? null,
        package_description: s.package_description ?? null,
        package_size: s.package_size ?? null,
        number_of_packages: s.number_of_packages ?? 1,
        fragile: s.fragile ?? false,
      },
    }));

    const { data: insertedStops, error: stopsErr } = await supabaseAdmin
      .from("job_stops")
      .insert(stopRows.map((r) => r.row) as never)
      .select("id, stop_order");
    if (stopsErr) throw new Error(stopsErr.message);

    // Map stop_order -> real id, then update linked_pickup_id
    const orderToId = new Map<number, string>();
    for (const s of insertedStops ?? []) orderToId.set(Number(s.stop_order), String(s.id));

    const tempIdToOrder = new Map<string, number>();
    stopRows.forEach((r, i) => tempIdToOrder.set(r.tempId, i + 1));

    const linkUpdates = data.stops
      .map((s, i) => {
        if (s.stop_type !== "dropoff" || !s.linked_pickup_tempId) return null;
        const myOrder = i + 1;
        const myId = orderToId.get(myOrder);
        const linkedOrder = tempIdToOrder.get(s.linked_pickup_tempId);
        const linkedId = linkedOrder ? orderToId.get(linkedOrder) : null;
        if (!myId || !linkedId) return null;
        return { id: myId, linked_pickup_id: linkedId };
      })
      .filter(Boolean) as { id: string; linked_pickup_id: string }[];

    for (const u of linkUpdates) {
      await supabaseAdmin
        .from("job_stops")
        .update({ linked_pickup_id: u.linked_pickup_id } as never)
        .eq("id", u.id);
    }

    // Optionally re-optimize order
    if (data.auto_optimize) {
      await supabaseAdmin.rpc("optimize_stop_order", { _job_id: job.id });
    }

    // Move to dispatching
    await supabaseAdmin
      .from("jobs")
      .update({ status: "נשלחה לשליחים" } as never)
      .eq("id", job.id);

    return { ok: true, jobId: job.id, jobNumber: job.job_number, payment, totalKm };
  });

function estimateRouteKm(
  stops: { lat?: number | null; lng?: number | null }[],
): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
      total += haversine(a.lat, a.lng, b.lat, b.lng);
    }
  }
  return Math.round(total * 10) / 10;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

/** Courier updates a single stop status */
export const updateStopStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        stopId: z.string().uuid(),
        status: z.enum(["arrived", "done"]),
        notes: z.string().max(500).optional().nullable(),
        proofPhotoUrl: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("courier_update_stop_status", {
      _stop_id: data.stopId,
      _new_status: data.status,
      _notes: data.notes ?? undefined,
      _proof_photo_url: data.proofPhotoUrl ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res as { ok: boolean; status?: string; reason?: string };
  });
