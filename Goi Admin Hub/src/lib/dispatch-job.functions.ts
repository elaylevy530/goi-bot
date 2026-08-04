import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function hasFreshGps(c: any) {
  if (c.location_sharing_enabled !== true || c.last_lat == null || c.last_lng == null) return false;
  if (!c.last_location_at) return true;
  return new Date(c.last_location_at).getTime() >= Date.now() - 30 * 60 * 1000;
}

function radiusKmFromLabel(label?: string | null): number {
  if (!label) return 15;
  if (label.includes("כל הארץ")) return 200;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 5;
  const m = label.match(/(\d+)/);
  return m ? Math.max(2, Math.min(200, parseInt(m[1]))) : 15;
}

function normJobType(v?: string | null) {
  return String(v ?? "")
    .replace(/[\s/\\|·\-–—]+/g, "")
    .trim();
}

function courierSupportsJobType(c: any, job: any): boolean {
  const service = String((job as any)?.service_category ?? "");
  const isMove = service === "small_move" || service === "big_move";
  const courierKind = c?.courier_kind === "mover" ? "mover" : "courier";
  if (isMove && courierKind !== "mover") return false;
  if (!isMove && courierKind === "mover") return false;

  const jobTypes: string[] = (c.job_types as string[] | null) ?? [];
  if (jobTypes.length === 0 || jobTypes.includes("*")) return true;

  const serviceWanted = service === "small_move"
    ? ["הובלה קטנה", "פריט בודד", "פירוק והרכבה"]
    : service === "big_move"
      ? ["הובלת דירה", "הובלה גדולה", "הובלת משרד", "הובלה בין עירונית"]
      : service === "same_day" || service === "scheduled"
        ? ["משלוח בודד", "חבילות / מסמכים"]
        : [];
  const wanted = [...serviceWanted, job.job_type, job.package_type, (job as any).item_category]
    .map((v) => normJobType(v))
    .filter(Boolean);
  if (wanted.length === 0) return true;

  const supports = jobTypes.map((v) => normJobType(v)).filter(Boolean);
  return supports.some((support) =>
    wanted.some((want) => {
      if (support === want || support.includes(want) || want.includes(support)) return true;

      // Business forms often save the package as "אוכל" while couriers choose
      // "משלוחי אוכל"; treat them as the same category so WhatsApp dispatch
      // matches what the courier app shows.
      if ((support.includes("אוכל") || support.includes("מזון") || support.includes("מסעד"))
        && (want.includes("אוכל") || want.includes("מזון") || want.includes("מסעד"))) return true;
      if ((support.includes("חבילה") || support.includes("מסמך"))
        && (want.includes("חבילה") || want.includes("מסמך"))) return true;
      if ((support.includes("הובלה") || support.includes("הובלת") || support.includes("פינוי") || support.includes("פירוק"))
        && (want.includes("הובלה") || want.includes("הובלת") || want.includes("פינוי") || want.includes("פירוק"))) return true;
      return false;
    }),
  );
}

/** Get current day-of-week (0=Sun..6=Sat) and minutes-of-day in Israel time.
 *  Cloudflare Workers run in UTC, so `new Date().getHours()` returns UTC hours
 *  and would wrongly filter out couriers whose availability is set in local time.
 */
function nowInIsrael(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[wd] ?? 0, minutes: (hh % 24) * 60 + mm };
}

function inWeeklyWindow(availability: string[] | null | undefined): boolean {
  if (!availability || availability.length === 0) return true;
  const dayKeys = ["א'","ב'","ג'","ד'","ה'","ו'","שבת"];
  const days = availability.filter((a) => dayKeys.includes(a));
  const range = availability.find((a) => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(a));
  const { day, minutes: cur } = nowInIsrael();
  if (days.length > 0 && !days.includes(dayKeys[day])) return false;
  if (range) {
    const [f, t] = range.split("-");
    const [fH, fM] = f.split(":").map(Number);
    const [tH, tM] = t.split(":").map(Number);
    const s = fH * 60 + fM, e = tH * 60 + tM;
    if (s < e ? !(cur >= s && cur < e) : !(cur >= s || cur < e)) return false;
  }
  return true;
}

type BusinessInfo = {
  payment_method_on_file?: boolean | null;
  business_name?: string | null;
  name?: string | null;
  phone?: string | null;
  pickup_contact_name?: string | null;
  pickup_contact_phone?: string | null;
};


/**
 * Dispatch a fixed-price / distance-based job to all approved & active couriers
 * whose declared areas (working_areas / pickup_areas / base_city / custom_*)
 * cover the job's pickup area. Sends a WhatsApp message with two quick-reply
 * buttons: "קח את המשלוח" / "דלג".
 *
 * First courier to press "קח" wins (handled by green-webhook-handler →
 * courier_claim_job_as_bot RPC). Others get a "כבר נתפס" reply.
 */
export const dispatchJobToCouriers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) =>
    z.object({ jobId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendButtons } = await import("./green-api.server");

    // 1. Load the job (caller must be able to read it via RLS)
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select(
        "id, job_number, short_code, service_category, job_type, pricing_type, status, pickup_address, pickup_area, pickup_lat, pickup_lng, pickup_contact_name, pickup_contact_phone, pickup_notes, dropoff_address, dropoff_area, dropoff_lat, dropoff_lng, dropoff_building, dropoff_entrance, dropoff_floor, dropoff_apartment, dropoff_notes, recipient_name, recipient_phone, vehicle_required, description, payment, customer_price, suggested_courier_payment, customer_id, estimated_distance_km, job_date, job_time, delivery_deadline, package_type, package_size, number_of_packages, item_category, fragile, per_job_paid, partner_id",
      )

      .eq("id", data.jobId)
      .single();
    if (jobErr || !job) throw new Error("Job not found");

    // 1a. Geocode any missing pickup/dropoff coordinates so GPS matching works.
    //     Uses the Google Maps connector gateway. Fire-and-forget patch via admin client.
    {
      const lovableKey = process.env.LOVABLE_API_KEY;
      const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
      if (lovableKey && mapsKey) {
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
          if (r) { patch.pickup_lat = r.lat; patch.pickup_lng = r.lng; (job as any).pickup_lat = r.lat; (job as any).pickup_lng = r.lng; }
        }
        const dropAddr = [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ").trim();
        if (dropAddr) {
          const { data: dCur } = await supabaseAdmin.from("jobs").select("dropoff_lat, dropoff_lng").eq("id", job.id).maybeSingle();
          if (!dCur?.dropoff_lat || !dCur?.dropoff_lng) {
            const r = await geocode(dropAddr);
            if (r) { patch.dropoff_lat = r.lat; patch.dropoff_lng = r.lng; }
          }
        }
        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from("jobs").update(patch as any).eq("id", job.id);
        }

      }
    }



    // 1b. Payment gate: allow if business has a saved vault OR this job was prepaid per-delivery.
    let businessInfo: BusinessInfo | null = null;

    if (job.customer_id) {
      const { data: biz } = await supabaseAdmin
        .from("customers")
        .select("payment_method_on_file, business_name, name, phone, pickup_contact_name, pickup_contact_phone")
        .eq("id", job.customer_id)
        .maybeSingle();
      businessInfo = (biz ?? null) as BusinessInfo | null;
      if (!(job as { per_job_paid?: boolean }).per_job_paid && !businessInfo?.payment_method_on_file) {
        throw new Error("לא ניתן לשדר משלוחים — נדרש להוסיף אמצעי תשלום שמור או לשלם פר־משלוח לפני שידור.");
      }
    }


    // 2. Pull approved & active couriers
    let q = supabaseAdmin
      .from("couriers")
      .select(
        "id, full_name, whatsapp_phone, courier_kind, vehicle_type, vehicle_types, base_city, working_areas, pickup_areas, custom_work_area, custom_pickup_area, work_distance_from_base, availability, job_types, accepting_jobs, admin_jobs_blocked, location_sharing_enabled, last_lat, last_lng, last_location_at, pause_until, max_concurrent_jobs, quiet_hours_start, quiet_hours_end, acceptance_rate, insurance_expires_at, license_expires_at",
      )
      .eq("courier_status", "פעיל")
      .eq("is_paused", false)
      .eq("accepting_jobs", true)
      .eq("admin_jobs_blocked", false)
      .not("whatsapp_phone", "is", null)
      .or("pause_until.is.null,pause_until.lt." + new Date().toISOString());

    if (job.vehicle_required) {
      // Allow either the legacy single vehicle_type OR any of vehicle_types
      q = q.or(
        `vehicle_type.eq.${job.vehicle_required},vehicle_types.cs.{${job.vehicle_required}}`,
      );
    }
    const { data: couriers, error: cErr } = await q.limit(200);
    if (cErr) throw new Error(cErr.message);

    // 2a. Smart engine pre-filters: quiet hours, expired docs, concurrent load
    const today = new Date().toISOString().slice(0, 10);
    const courierIds = (couriers ?? []).map((c) => c.id);
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
    const nowMin = (() => {
      const d = new Date();
      return d.getHours() * 60 + d.getMinutes();
    })();
    function inQuiet(start?: string | null, end?: string | null): boolean {
      if (!start || !end) return false;
      const [sH, sM] = start.split(":").map(Number);
      const [eH, eM] = end.split(":").map(Number);
      if (isNaN(sH) || isNaN(eH)) return false;
      const s = sH * 60 + sM, e = eH * 60 + eM;
      return s < e ? (nowMin >= s && nowMin < e) : (nowMin >= s || nowMin < e);
    }
    const engineFiltered = (couriers ?? []).filter((c: any) => {
      if (inQuiet(c.quiet_hours_start, c.quiet_hours_end)) return false;
      if (c.insurance_expires_at && c.insurance_expires_at < today) return false;
      if (c.license_expires_at && c.license_expires_at < today) return false;
      // Availability window intentionally disabled — courier availability is
      // governed only by being active + not paused in the system.

      if (!courierSupportsJobType(c, job)) return false;
      const max = Number(c.max_concurrent_jobs ?? 2);
      const active = loadMap.get(c.id) ?? 0;
      if (active >= max) return false;
      return true;
    });



    // 2b. Load business favorites (preferred + blocked) for this customer
    const preferredIds = new Set<string>();
    const blockedIds = new Set<string>();
    let favoritesFirstEnabled = true;
    if (job.customer_id) {
      const [favsRes, bizRes] = await Promise.all([
        supabaseAdmin
          .from("business_favorite_couriers")
          .select("courier_id, status")
          .eq("business_id", job.customer_id),
        supabaseAdmin
          .from("customers")
          .select("favorites_first_enabled")
          .eq("id", job.customer_id)
          .maybeSingle(),
      ]);
      for (const f of favsRes.data ?? []) {
        if (f.status === "preferred") preferredIds.add(f.courier_id);
        else if (f.status === "blocked") blockedIds.add(f.courier_id);
      }
      favoritesFirstEnabled =
        (bizRes.data as { favorites_first_enabled?: boolean } | null)?.favorites_first_enabled ?? true;
    }

    // 3. Filter by area match (exclude blocked couriers)
    const pickup = (job.pickup_area || job.pickup_address || "").trim();
    const allMatches = engineFiltered.filter((c: any) => {
      if (blockedIds.has(c.id)) return false;
      const personalRadius = radiusKmFromLabel(c.work_distance_from_base);
      if (hasFreshGps(c) && job.pickup_lat != null && job.pickup_lng != null) {
        const km = haversineKm(Number(job.pickup_lat), Number(job.pickup_lng), Number(c.last_lat), Number(c.last_lng));
        if (km <= personalRadius) return true;
      }

      if (!pickup) return true; // no area → notify everyone active
      const areas = [
        ...((c.working_areas as string[] | null) ?? []),
        ...((c.pickup_areas as string[] | null) ?? []),
        c.base_city,
        c.custom_work_area,
        c.custom_pickup_area,
      ]
        .filter(Boolean)
        .map((a) => (a as string).trim());
      if (areas.includes("כל הארץ")) return true;
      return areas.some(
        (a) => a === pickup || pickup.includes(a) || a.includes(pickup),
      );
    });

    // 3a. Smart ranking: GPS-near first, then higher acceptance_rate
    allMatches.sort((a: any, b: any) => {
      const aNear = hasFreshGps(a) && job.pickup_lat != null ? 1 : 0;
      const bNear = hasFreshGps(b) && job.pickup_lat != null ? 1 : 0;
      if (aNear !== bNear) return bNear - aNear;
      return Number(b.acceptance_rate ?? 0) - Number(a.acceptance_rate ?? 0);
    });

    // 3b. Favorites-first: if business has at least one matching preferred courier,
    // send ONLY to favorites this round. The pickup-watchdog falls back to the rest
    // after `favorites_fallback_minutes` if no one accepts.
    const favoriteMatches = allMatches.filter((c: any) => preferredIds.has(c.id));
    const favoritesOnly = favoritesFirstEnabled && favoriteMatches.length > 0;
    const matches = favoritesOnly ? favoriteMatches : allMatches;



    // 4. Build the WhatsApp message
    const price = job.payment || job.suggested_courier_payment || job.customer_price;

    // Pickup / dropoff lines: show street + city when both exist
    const pickupLine = [job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—";
    const dropoffLine = [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—";
    const businessName = businessInfo?.business_name || businessInfo?.name || "";
    const pickupContactName = job.pickup_contact_name || businessInfo?.pickup_contact_name || businessInfo?.name || "";
    const pickupContactPhone = job.pickup_contact_phone || businessInfo?.pickup_contact_phone || businessInfo?.phone || "";
    const dropoffExtras = [
      job.dropoff_building ? `בניין ${job.dropoff_building}` : "",
      job.dropoff_entrance ? `כניסה ${job.dropoff_entrance}` : "",
      job.dropoff_floor ? `קומה ${job.dropoff_floor}` : "",
      job.dropoff_apartment ? `דירה ${job.dropoff_apartment}` : "",
    ].filter(Boolean).join(" · ");

    // Pickup time / window (job_date + job_time may be ASAP "ready in X min" or scheduled)
    let whenLine = "";
    if (job.job_date || job.job_time) {
      const today = new Date().toISOString().slice(0, 10);
      const isToday = job.job_date === today;
      const dateStr = job.job_date
        ? (isToday ? "היום" : new Date(job.job_date).toLocaleDateString("he-IL"))
        : "";
      whenLine = `⏰ זמן איסוף: ${[dateStr, job.job_time].filter(Boolean).join(" ")}\n`;
    } else {
      whenLine = `⏰ זמן איסוף: עכשיו (ASAP)\n`;
    }

    // Delivery deadline (מסירה עד HH:MM) — from delivery_deadline timestamptz
    const deadlineTime = job.delivery_deadline
      ? new Date(job.delivery_deadline).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
      : "";
    const deadlineLine = deadlineTime ? `🎯 מסירה עד: ${deadlineTime}\n` : "";

    // Package "what's inside" — this is what the courier really needs to see
    const pkgBits: string[] = [];
    if (job.package_size) pkgBits.push(`גודל ${job.package_size}`);
    const qty = Number(job.number_of_packages) || 0;
    if (qty > 1) pkgBits.push(`כמות: ${qty}`);
    if (job.fragile) pkgBits.push("⚠️ שביר");
    const pkgSuffix = pkgBits.length ? ` (${pkgBits.join(" · ")})` : "";
    const packageMain = job.package_type || job.job_type || "משלוח";
    const pkgParts: string[] = [packageMain, ...pkgBits];

    const favHeader = favoritesOnly
      ? `⭐ הצעה ראשונה לשליחים המועדפים של העסק\n\n`
      : "";
    // NOTE: לפני שהשליח לקח את המשלוח – לא חושפים פרטים אישיים
    // (איש קשר איסוף, טלפונים, נמען, קומה/דירה/כניסה, הערות).
    // הפרטים המלאים נשלחים רק אחרי "קח את המשלוח" בהודעת ההזנקה לאיסוף.
    const fallbackSummary =
      favHeader +
      `🚚 משלוח חדש זמין!\n\n` +
      `📦 סוג: ${packageMain}${pkgSuffix}\n` +
      `📍 איסוף: ${pickupLine}\n` +
      (businessName ? `🏢 עסק: ${businessName}\n` : "") +
      `🎯 מסירה: ${dropoffLine}\n` +
      (job.estimated_distance_km ? `📏 מרחק: ${Number(job.estimated_distance_km).toFixed(1)} ק"מ\n` : "") +
      whenLine +
      deadlineLine +
      (job.vehicle_required ? `🚗 רכב: ${job.vehicle_required}\n` : "") +
      (price ? `💰 תשלום: ₪${price}\n` : "") +
      `\nהשליח הראשון שילחץ "קח את המשלוח" — לוקח את העבודה.`;





    const { renderTemplate } = await import("./bot-templates.server");
    const rendered = await renderTemplate(
      "delivery_offer",
      {
        job_id: job.id,
        job_number: job.job_number ?? "",
        job_type: job.job_type ?? "",
        package_type: job.package_type ?? "",
        package_size: job.package_size ?? "",
        package_qty: job.number_of_packages ? String(job.number_of_packages) : "",
        package_line: pkgParts.join(" · "),
        pickup: pickupLine,
        dropoff: dropoffLine,
        pickup_address: pickupLine,
        dropoff_address: dropoffLine,
        business_name: businessName,
        customer_name: businessName,
        // פרטים אישיים מוסתרים בשלב ההצעה — יישלחו רק אחרי שהשליח לוקח
        pickup_contact_name: "",
        pickup_contact_phone: "",
        pickup_notes: "",
        dropoff_extras: "",
        dropoff_building: "",
        dropoff_entrance: "",
        dropoff_floor: "",
        dropoff_apartment: "",
        dropoff_notes: "",
        recipient_name: "",
        recipient_phone: "",
        distance: job.estimated_distance_km ? Number(job.estimated_distance_km).toFixed(1) : "",
        when: whenLine.trim(),
        deadline: deadlineTime,
        deadline_line: deadlineLine.trim(),
        vehicle: job.vehicle_required ?? "",
        price: price ?? "",
        description: "",


      },
      {
        body: fallbackSummary,
        buttons: [
          { buttonId: `claim:${job.id}:bid`, buttonText: "✅ קח את המשלוח" },
          { buttonId: `claim:${job.id}:skip`, buttonText: "❌ דלג" },
        ],
      },
    );
    const summary = rendered.body;
    const offerButtons = rendered.buttons.length
      ? rendered.buttons
      : [
          { buttonId: `claim:${job.id}:bid`, buttonText: "✅ קח את המשלוח" },
          { buttonId: `claim:${job.id}:skip`, buttonText: "❌ דלג" },
        ];

    // Fire all WhatsApp sends in parallel; do NOT await per-courier DB inserts inside the loop.
    const now = new Date().toISOString();
    const sendResults = await Promise.allSettled(
      matches
        .filter((c) => !!c.whatsapp_phone)
        .map((c) =>
          sendButtons(c.whatsapp_phone!, summary, offerButtons, "GOI").then((res) => ({
            courier: c,
            idMessage:
              (res && typeof res === "object" && "idMessage" in res
                ? String((res as { idMessage?: unknown }).idMessage ?? "")
                : "") || null,
          })),
        ),
    );

    // Batch insert all whatsapp_messages rows in a single round-trip (don't block response).
    const rows = sendResults
      .map((r) =>
        r.status === "fulfilled"
          ? {
              phone: r.value.courier.whatsapp_phone!,
              courier_id: r.value.courier.id,
              job_id: job.id,
              direction: "outbound",
              delivery_status: "sent",
              body: summary,
              external_message_id: r.value.idMessage,
              message_type: "offer_buttons",
              sent_at: now,
              last_status_at: now,
            }
          : null,
      )
      .filter(Boolean) as Array<Record<string, unknown>>;
    if (rows.length) {
      void supabaseAdmin
        .from("whatsapp_messages")
        .insert(rows as never)
        .then(({ error }) => {
          if (error) console.error("[dispatchJobToCouriers] batch insert failed:", error.message);
        });
    }
    sendResults.forEach((r, i) => {
      if (r.status === "rejected") console.error("[dispatchJobToCouriers] WA failed for", matches[i]?.id, r.reason);
    });
    const sent = rows.length;

    // POC: also broadcast to the shared WhatsApp GROUP (couriers / movers)
    // so the notification is reliable even when per-device push is partial.
    try {
      const { sendJobToWhatsAppGroup } = await import("./whatsapp/group-dispatch.server");
      // A partner panel (e.g. "אלוף ההובלות") can route its jobs to its own group.
      let partner: any = null;
      const partnerId = (job as any)?.partner_id;
      if (partnerId) {
        const { data: p } = await supabaseAdmin
          .from("partners")
          .select("name, contact_phone, whatsapp_group_id, dispatch_note, message_sections, message_cta")
          .eq("id", partnerId)
          .maybeSingle();
        partner = p ?? null;
      }
      const gRes = await sendJobToWhatsAppGroup({
        ...(job as any),
        business_name: businessName || undefined,
      }, partner);
      console.log("[dispatchJobToCouriers] group dispatch:", gRes);
    } catch (e) {
      console.error("[dispatchJobToCouriers] group dispatch failed:", e);
    }

    // Insert offer_events for each matched courier so the in-app realtime
    // subscription (filtered by courier_id) fires ONLY for actual matches.
    // This is what powers the toast + sound + vibration on the courier's phone.
    let insertedOfferCourierIds: string[] = [];
    if (matches.length) {
      const offerRows = matches.map((c: any) => {
        const km = (hasFreshGps(c) && job.pickup_lat != null && job.pickup_lng != null)
          ? haversineKm(Number(job.pickup_lat), Number(job.pickup_lng), Number(c.last_lat), Number(c.last_lng))
          : null;
        return {
          job_id: job.id,
          courier_id: c.id,
          channel: "app" as const,
          response: "pending" as const,
          sent_at: now,
          distance_km: km,
          courier_lat: c.last_lat ?? null,
          courier_lng: c.last_lng ?? null,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          metadata: { favoritesOnly, preferred: preferredIds.has(c.id) } as any,
        };
      });
      const { error: oeErr } = await supabaseAdmin.from("offer_events").insert(offerRows as never);
      if (oeErr) console.error("[dispatchJobToCouriers] offer_events insert failed:", oeErr.message);
      else insertedOfferCourierIds = matches.map((c: any) => c.id);
    }


    // Fan-out encrypted Web Push only after the offer row exists, so every
    // actual in-app offer also wakes the courier's phone.
    try {
      if (insertedOfferCourierIds.length) {
        const { sendOfferPushToCouriers } = await import("./push/offer-push.server");
        await sendOfferPushToCouriers(job as any, insertedOfferCourierIds);
      }
    } catch (e) {
      console.error("[dispatchJobToCouriers] push fan-out failed:", e);
    }


    // Mark job so the watchdog can fall back to non-favorites after the timeout.
    if (favoritesOnly) {
      void supabaseAdmin
        .from("jobs")
        .update({
          favorites_only_dispatched_at: now,
          favorites_only_fallback_done: false,
        } as never)
        .eq("id", job.id)
        .then(({ error }) => {
          if (error) console.error("[dispatchJobToCouriers] favorites flag failed:", error.message);
        });
    } else {
      // Plain dispatch — make sure the flag is clear so watchdog won't fire fallback.
      void supabaseAdmin
        .from("jobs")
        .update({
          favorites_only_dispatched_at: null,
          favorites_only_fallback_done: false,
        } as never)
        .eq("id", job.id);
    }

    return {
      ok: true,
      sent,
      candidates: matches.length,
      total: couriers?.length ?? 0,
      favoritesOnly,
      favoritesCount: favoriteMatches.length,
    };
  });

