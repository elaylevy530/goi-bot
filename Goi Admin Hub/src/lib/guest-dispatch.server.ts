function textList(...values: unknown[]) {
  return values
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function normJobType(v?: string | null) {
  return String(v ?? "")
    .replace(/[\s/\\|·\-–—]+/g, "")
    .trim();
}

function hasFreshGps(courier: any) {
  if (courier?.location_sharing_enabled !== true || courier?.last_lat == null || courier?.last_lng == null) return false;
  if (!courier?.last_location_at) return true;
  return new Date(courier.last_location_at).getTime() >= Date.now() - 30 * 60 * 1000;
}

function distanceKm(aLat?: unknown, aLng?: unknown, bLat?: unknown, bLng?: unknown) {
  const lat1 = Number(aLat);
  const lng1 = Number(aLng);
  const lat2 = Number(bLat);
  const lng2 = Number(bLng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

function radiusKmFromLabel(label?: string | null): number {
  if (!label) return 15;
  if (label.includes("כל הארץ")) return 200;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 5;
  const m = String(label).match(/(\d+)/);
  return m ? Math.max(2, Math.min(200, parseInt(m[1], 10))) : 15;
}

function wantedJobTokens(job: any) {
  const service = String(job?.service_category ?? "");
  if (service === "small_move") return ["הובלה קטנה", "פריט בודד", "פירוק והרכבה"];
  if (service === "big_move") return ["הובלת דירה", "הובלה גדולה", "הובלת משרד", "הובלה בין עירונית"];
  if (service === "same_day" || service === "scheduled") return ["משלוח בודד", "חבילות / מסמכים"];
  return textList(job?.job_type, job?.package_type, job?.item_category);
}

function courierSupportsJob(job: any, courier: any) {
  const service = String(job?.service_category ?? "");
  const isMove = service === "small_move" || service === "big_move";
  const courierKind = courier?.courier_kind === "mover" ? "mover" : "courier";
  if (isMove && courierKind !== "mover") return false;
  if (!isMove && courierKind === "mover") return false;

  // Movers are matched by kind alone: their intake stores a generic job type
  // ("אחר"), so a token comparison would wrongly exclude every moving job.
  if (isMove && courierKind === "mover") return true;

  const jobTypes = textList(courier?.job_types);
  if (jobTypes.length === 0 || jobTypes.includes("*") || jobTypes.includes("אחר")) return true;

  const wanted = wantedJobTokens(job).map((v) => normJobType(v)).filter(Boolean);
  if (wanted.length === 0) return true;

  const supports = jobTypes.map((v) => normJobType(v)).filter(Boolean);
  return supports.some((support) =>
    wanted.some((want) => {
      if (support === want || support.includes(want) || want.includes(support)) return true;
      if ((support.includes("אוכל") || support.includes("מזון") || support.includes("מסעד"))
        && (want.includes("אוכל") || want.includes("מזון") || want.includes("מסעד"))) return true;
      if ((support.includes("חבילה") || support.includes("מסמך") || support.includes("משלוחבודד"))
        && (want.includes("חבילה") || want.includes("מסמך") || want.includes("משלוחבודד"))) return true;
      if ((support.includes("הובלה") || support.includes("הובלת") || support.includes("פינוי") || support.includes("פירוק"))
        && (want.includes("הובלה") || want.includes("הובלת") || want.includes("פינוי") || want.includes("פירוק"))) return true;
      return false;
    }),
  );
}

function matchesArea(job: any, courier: any) {
  const personalRadius = radiusKmFromLabel(courier?.work_distance_from_base);
  if (hasFreshGps(courier) && job?.pickup_lat != null && job?.pickup_lng != null) {
    const km = distanceKm(job.pickup_lat, job.pickup_lng, courier.last_lat, courier.last_lng);
    if (km != null && km <= personalRadius) return true;
  }

  const pickup = String(job?.pickup_area || job?.pickup_address || "").trim();
  if (!pickup) return true;
  const areas = textList(
    courier?.working_areas,
    courier?.pickup_areas,
    courier?.base_city,
    courier?.custom_work_area,
    courier?.custom_pickup_area,
  );
  if (areas.includes("כל הארץ")) return true;
  return areas.some((area) => area === pickup || pickup.includes(area) || area.includes(pickup));
}

export async function broadcastGuestJobToMatchingCouriers(jobId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("jobs")
    .select("id, job_number, short_code, status, selected_courier_id, service_category, job_type, pricing_type, pickup_address, pickup_area, pickup_lat, pickup_lng, dropoff_address, dropoff_area, dropoff_lat, dropoff_lng, vehicle_required, description, payment, customer_price, suggested_courier_payment, estimated_distance_km, job_date, job_time, delivery_deadline, package_type, package_size, number_of_packages, item_category, partner_id")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr || !job) throw new Error(jobErr?.message ?? "Job not found");
  if (job.selected_courier_id || job.status !== "נשלחה לשליחים") return { ok: true, sent: 0, candidates: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const { data: couriers, error: couriersErr } = await supabaseAdmin
    .from("couriers")
    .select("id, full_name, whatsapp_phone, courier_kind, vehicle_type, vehicle_types, base_city, working_areas, pickup_areas, custom_work_area, custom_pickup_area, work_distance_from_base, job_types, accepting_jobs, admin_jobs_blocked, location_sharing_enabled, last_lat, last_lng, last_location_at, pause_until, max_concurrent_jobs, quiet_hours_start, quiet_hours_end, acceptance_rate, insurance_expires_at, license_expires_at")
    .eq("courier_status", "פעיל")
    .eq("is_paused", false)
    .eq("accepting_jobs", true)
    .eq("admin_jobs_blocked", false)
    .or("pause_until.is.null,pause_until.lt." + new Date().toISOString())
    .limit(250);
  if (couriersErr) throw new Error(couriersErr.message);

  const courierIds = (couriers ?? []).map((c: any) => c.id);
  const loadMap = new Map<string, number>();
  if (courierIds.length > 0) {
    const { data: activeJobs } = await supabaseAdmin
      .from("jobs")
      .select("selected_courier_id, status")
      .in("selected_courier_id", courierIds)
      .in("status", ["נבחר שליח", "יש שליחים שאישרו", "פעילה"]);
    for (const r of activeJobs ?? []) {
      const id = (r as { selected_courier_id?: string }).selected_courier_id;
      if (id) loadMap.set(id, (loadMap.get(id) ?? 0) + 1);
    }
  }

  const matches = (couriers ?? [])
    .filter((c: any) => {
      if (c.insurance_expires_at && c.insurance_expires_at < today) return false;
      if (c.license_expires_at && c.license_expires_at < today) return false;
      if (Number(loadMap.get(c.id) ?? 0) >= Number(c.max_concurrent_jobs ?? 2)) return false;
      if (job.vehicle_required) {
        const vehicles = textList(c.vehicle_type, c.vehicle_types);
        if (vehicles.length > 0 && !vehicles.includes(job.vehicle_required)) return false;
      }
      return courierSupportsJob(job, c) && matchesArea(job, c);
    })
    .sort((a: any, b: any) => Number(b.acceptance_rate ?? 0) - Number(a.acceptance_rate ?? 0));

  await supabaseAdmin
    .from("jobs")
    .update({ matching_couriers_count: matches.length } as never)
    .eq("id", job.id);

  // Broadcast to the WhatsApp group (couriers / movers, or a partner group).
  // Runs regardless of in-app matches so the job is always visible in WhatsApp.
  try {
    let partner: any = null;
    const partnerId = (job as any).partner_id;
    if (partnerId) {
      const { data: p } = await supabaseAdmin
        .from("partners")
        .select("name, contact_phone, whatsapp_group_id, dispatch_note, message_sections, message_cta")
        .eq("id", partnerId)
        .maybeSingle();
      partner = p ?? null;
    }
    const { sendJobToWhatsAppGroup } = await import("./whatsapp/group-dispatch.server");
    const res = await sendJobToWhatsAppGroup(job as any, partner);
    console.log("[guest-dispatch] whatsapp group:", res, { jobId: job.id });
  } catch (e) {
    console.error("[guest-dispatch] whatsapp group send failed:", e);
  }

  if (!matches.length) return { ok: true, sent: 0, candidates: 0 };

  const matchIds = matches.map((c: any) => c.id);
  const { data: existing } = await supabaseAdmin
    .from("offer_events")
    .select("courier_id")
    .eq("job_id", job.id)
    .in("courier_id", matchIds);
  const existingIds = new Set((existing ?? []).map((r: any) => r.courier_id));
  const now = new Date().toISOString();
  const offerRows = matches
    .filter((c: any) => !existingIds.has(c.id))
    .map((c: any) => ({
      job_id: job.id,
      courier_id: c.id,
      channel: "app" as const,
      response: "pending" as const,
      sent_at: now,
      distance_km: hasFreshGps(c) && job.pickup_lat != null && job.pickup_lng != null
        ? distanceKm(job.pickup_lat, job.pickup_lng, c.last_lat, c.last_lng)
        : null,
      courier_lat: c.last_lat ?? null,
      courier_lng: c.last_lng ?? null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      metadata: { source: "guest_order", service_category: job.service_category } as any,
    }));

  if (offerRows.length) {
    const { error: offerErr } = await supabaseAdmin.from("offer_events").insert(offerRows as never);
    if (offerErr) throw new Error(offerErr.message);
    try {
      const { sendOfferPushToCouriers } = await import("./push/offer-push.server");
      await sendOfferPushToCouriers(job as any, offerRows.map((r) => r.courier_id));
    } catch (e) {
      console.error("[guest-dispatch] push fan-out failed:", e);
    }
  }

  return { ok: true, sent: offerRows.length, candidates: matches.length };
}