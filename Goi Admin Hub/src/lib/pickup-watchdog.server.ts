// Server-only helper that powers the pickup-watchdog cron route.
// 1) Sends a reminder ("יצאתי לאיסוף?") to a courier that accepted but never
//    pressed "יצאתי לאיסוף" within N minutes.
// 2) If still no movement N minutes after the reminder — releases the job
//    back to dispatch (clears the selected courier) and re-broadcasts the
//    offer to all matching couriers.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendButtons } from "./green-api.server";

const REMINDER_TEXT = (jobNumber: string | null) =>
  `⏰ תזכורת — המשלוח ${jobNumber ? `#${jobNumber}` : ""} עדיין לא יצא לאיסוף.\n` +
  `אם אתה בדרך — לחץ "🚀 יצאתי לאיסוף". אם אינך יכול לבצע — לחץ "❌ שחרר משלוח".`;

async function sendReminderForJob(job: {
  id: string;
  job_number: string | null;
  selected_courier_id: string | null;
}) {
  if (!job.selected_courier_id) return false;
  const { data: courier } = await supabaseAdmin
    .from("couriers")
    .select("id, whatsapp_phone")
    .eq("id", job.selected_courier_id)
    .single();
  if (!courier?.whatsapp_phone) return false;

  const body = REMINDER_TEXT(job.job_number);
  const buttons = [
    { buttonId: `delivery_heading_to_pickup:${job.id}`, buttonText: "🚀 יצאתי לאיסוף" },
    { buttonId: `release_job:${job.id}`, buttonText: "❌ שחרר משלוח" },
  ];

  try {
    const res = (await sendButtons(courier.whatsapp_phone, body, buttons, "GOI")) as
      | { idMessage?: string }
      | undefined;
    const now = new Date().toISOString();
    await supabaseAdmin.from("whatsapp_messages").insert({
      phone: courier.whatsapp_phone,
      courier_id: courier.id,
      job_id: job.id,
      direction: "outbound",
      delivery_status: "sent",
      body,
      external_message_id: res?.idMessage ?? null,
      message_type: "pickup_reminder",
      sent_at: now,
      last_status_at: now,
    } as never);
    await supabaseAdmin
      .from("jobs")
      .update({ pickup_reminder_sent_at: now } as never)
      .eq("id", job.id);
    return true;
  } catch (e) {
    console.error("[pickup-watchdog] reminder failed", job.id, e);
    return false;
  }
}

export async function redispatchJob(jobId: string) {
  // 1. Fetch job and clear the selected courier so dispatch sees it as open.
  const { data: job, error: jErr } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, job_number, job_type, pickup_address, pickup_area, dropoff_address, dropoff_area, vehicle_required, description, payment, customer_price, suggested_courier_payment, estimated_distance_km, job_date, job_time, package_type, package_size, number_of_packages, fragile, selected_courier_id, pickup_redispatch_count",
    )
    .eq("id", jobId)
    .single();
  if (jErr || !job) return false;

  const previousCourier = job.selected_courier_id;
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("jobs")
    .update({
      selected_courier_id: null,
      status: "נשלחה לשליחים",
      delivery_status: null,
      courier_step: null,
      accepted_at: null,
      pickup_reminder_sent_at: null,
      pickup_redispatched_at: now,
      pickup_redispatch_count: (job.pickup_redispatch_count ?? 0) + 1,
    } as never)
    .eq("id", jobId);

  // Mark the previous courier's pending offers cancelled so they can't re-claim.
  if (previousCourier) {
    await supabaseAdmin
      .from("offer_events")
      .update({ response: "cancelled", responded_at: now } as never)
      .eq("job_id", jobId)
      .eq("courier_id", previousCourier);
    // Notify the previous courier their slot was released.
    const { data: prevC } = await supabaseAdmin
      .from("couriers")
      .select("whatsapp_phone")
      .eq("id", previousCourier)
      .single();
    if (prevC?.whatsapp_phone) {
      try {
        const { sendText } = await import("./green-api.server");
        await sendText(
          prevC.whatsapp_phone,
          `⚠️ המשלוח ${job.job_number ? `#${job.job_number}` : ""} שוחרר אוטומטית מאחר ולא יצאת לאיסוף בזמן ועובר לשליח אחר.`,
        );
      } catch (e) {
        console.error("[pickup-watchdog] notify prev courier failed", e);
      }
    }
  }

  // 2. Find matching couriers (mirror logic of dispatchJobToCouriers, excluding the prev one).
  let q = supabaseAdmin
    .from("couriers")
    .select(
      "id, full_name, whatsapp_phone, vehicle_type, vehicle_types, base_city, working_areas, pickup_areas, custom_work_area, custom_pickup_area",
    )
    .eq("courier_status", "פעיל")
    .eq("is_paused", false)
    .not("whatsapp_phone", "is", null);
  if (job.vehicle_required) {
    q = q.or(
      `vehicle_type.eq.${job.vehicle_required},vehicle_types.cs.{${job.vehicle_required}}`,
    );
  }
  const { data: couriers } = await q.limit(200);

  const pickup = (job.pickup_area || "").trim();
  const matches = (couriers ?? []).filter((c) => {
    if (c.id === previousCourier) return false;
    if (!pickup) return true;
    const areas = [
      ...(((c.working_areas as string[] | null) ?? [])),
      ...(((c.pickup_areas as string[] | null) ?? [])),
      c.base_city,
      c.custom_work_area,
      c.custom_pickup_area,
    ]
      .filter(Boolean)
      .map((a) => (a as string).trim());
    if (areas.includes("כל הארץ")) return true;
    return areas.some((a) => a === pickup || pickup.includes(a) || a.includes(pickup));
  });

  // 3. Build same offer text/buttons used by dispatchJobToCouriers.
  const price = job.payment || job.suggested_courier_payment || job.customer_price;
  const pickupLine =
    [job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—";
  const dropoffLine =
    [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—";

  let whenLine = "";
  if (job.job_date || job.job_time) {
    const today = new Date().toISOString().slice(0, 10);
    const isToday = job.job_date === today;
    const dateStr = job.job_date
      ? isToday
        ? "היום"
        : new Date(job.job_date).toLocaleDateString("he-IL")
      : "";
    whenLine = `⏰ זמן איסוף: ${[dateStr, job.job_time].filter(Boolean).join(" ")}\n`;
  } else {
    whenLine = `⏰ זמן איסוף: עכשיו (ASAP)\n`;
  }

  const pkgBits: string[] = [];
  if (job.package_size) pkgBits.push(`גודל ${job.package_size}`);
  const qty = Number(job.number_of_packages) || 0;
  if (qty > 1) pkgBits.push(`כמות: ${qty}`);
  if (job.fragile) pkgBits.push("⚠️ שביר");
  const pkgSuffix = pkgBits.length ? ` (${pkgBits.join(" · ")})` : "";
  const packageMain = job.package_type || job.job_type || "משלוח";

  const body =
    `🔄 משלוח שוחרר ופנוי שוב!\n\n` +
    `📦 סוג: ${packageMain}${pkgSuffix}\n` +
    `📍 איסוף: ${pickupLine}\n` +
    `🎯 מסירה: ${dropoffLine}\n` +
    (job.estimated_distance_km
      ? `📏 מרחק: ${Number(job.estimated_distance_km).toFixed(1)} ק"מ\n`
      : "") +
    whenLine +
    (job.vehicle_required ? `🚗 רכב: ${job.vehicle_required}\n` : "") +
    (price ? `💰 תשלום: ₪${price}\n` : "") +
    (job.description ? `📝 ${job.description}\n` : "") +
    `\nהשליח הראשון שילחץ "קח את המשלוח" — לוקח את העבודה.`;

  const buttons = [
    { buttonId: `claim:${job.id}:bid`, buttonText: "✅ קח את המשלוח" },
    { buttonId: `claim:${job.id}:skip`, buttonText: "❌ דלג" },
  ];

  const results = await Promise.allSettled(
    matches
      .filter((c) => !!c.whatsapp_phone)
      .map((c) =>
        sendButtons(c.whatsapp_phone!, body, buttons, "GOI").then((res) => ({
          courier: c,
          idMessage:
            res && typeof res === "object" && "idMessage" in (res as object)
              ? String((res as { idMessage?: unknown }).idMessage ?? "")
              : "",
        })),
      ),
  );

  const rows = results
    .map((r) =>
      r.status === "fulfilled"
        ? {
            phone: r.value.courier.whatsapp_phone!,
            courier_id: r.value.courier.id,
            job_id: job.id,
            direction: "outbound",
            delivery_status: "sent",
            body,
            external_message_id: r.value.idMessage || null,
            message_type: "offer_buttons",
            sent_at: now,
            last_status_at: now,
          }
        : null,
    )
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (rows.length) {
    await supabaseAdmin.from("whatsapp_messages").insert(rows as never);
    try {
      const { sendOfferPushToCouriers } = await import("./push/offer-push.server");
      await sendOfferPushToCouriers(job as any, rows.map((r) => String(r.courier_id)), { titlePrefix: "🔄 משלוח פנוי שוב" });
    } catch (e) {
      console.error("[pickup-watchdog] redispatch push failed", e);
    }
  }
  return true;
}

/**
 * Send the offer to NON-favorite matching couriers after the favorites-first
 * window expired without a claim. Mirrors dispatchJobToCouriers but excludes
 * couriers that were already notified in the favorites round (and blocked).
 */
export async function runFavoritesFallback(jobId: string) {
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, job_number, customer_id, job_type, pickup_address, pickup_area, dropoff_address, dropoff_area, vehicle_required, description, payment, customer_price, suggested_courier_payment, estimated_distance_km, job_date, job_time, package_type, package_size, number_of_packages, fragile",
    )
    .eq("id", jobId)
    .single();
  if (!job) return false;

  // Already-notified couriers in the favorites round
  const { data: notified } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("courier_id")
    .eq("job_id", jobId)
    .eq("message_type", "offer_buttons")
    .not("courier_id", "is", null);
  const notifiedIds = new Set((notified ?? []).map((n) => n.courier_id as string));

  // Blocked couriers for this business
  const blockedIds = new Set<string>();
  if (job.customer_id) {
    const { data: favs } = await supabaseAdmin
      .from("business_favorite_couriers")
      .select("courier_id, status")
      .eq("business_id", job.customer_id)
      .eq("status", "blocked");
    for (const f of favs ?? []) blockedIds.add(f.courier_id);
  }

  let q = supabaseAdmin
    .from("couriers")
    .select(
      "id, full_name, whatsapp_phone, vehicle_type, vehicle_types, base_city, working_areas, pickup_areas, custom_work_area, custom_pickup_area",
    )
    .eq("courier_status", "פעיל")
    .eq("is_paused", false)
    .not("whatsapp_phone", "is", null);
  if (job.vehicle_required) {
    q = q.or(
      `vehicle_type.eq.${job.vehicle_required},vehicle_types.cs.{${job.vehicle_required}}`,
    );
  }
  const { data: couriers } = await q.limit(200);

  const pickup = (job.pickup_area || "").trim();
  const matches = (couriers ?? []).filter((c) => {
    if (notifiedIds.has(c.id) || blockedIds.has(c.id)) return false;
    if (!pickup) return true;
    const areas = [
      ...(((c.working_areas as string[] | null) ?? [])),
      ...(((c.pickup_areas as string[] | null) ?? [])),
      c.base_city,
      c.custom_work_area,
      c.custom_pickup_area,
    ]
      .filter(Boolean)
      .map((a) => (a as string).trim());
    if (areas.includes("כל הארץ")) return true;
    return areas.some((a) => a === pickup || pickup.includes(a) || a.includes(pickup));
  });

  // Mark the job as fallback-done first so we don't run it twice on overlapping cron ticks
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("jobs")
    .update({ favorites_only_fallback_done: true } as never)
    .eq("id", jobId);

  if (!matches.length) return true;

  const price = job.payment || job.suggested_courier_payment || job.customer_price;
  const pickupLine = [job.pickup_address, job.pickup_area].filter(Boolean).join(", ") || "—";
  const dropoffLine = [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ") || "—";
  let whenLine = "";
  if (job.job_date || job.job_time) {
    const today = new Date().toISOString().slice(0, 10);
    const isToday = job.job_date === today;
    const dateStr = job.job_date ? (isToday ? "היום" : new Date(job.job_date).toLocaleDateString("he-IL")) : "";
    whenLine = `⏰ זמן איסוף: ${[dateStr, job.job_time].filter(Boolean).join(" ")}\n`;
  } else {
    whenLine = `⏰ זמן איסוף: עכשיו (ASAP)\n`;
  }
  const pkgBits: string[] = [];
  if (job.package_size) pkgBits.push(`גודל ${job.package_size}`);
  const qty = Number(job.number_of_packages) || 0;
  if (qty > 1) pkgBits.push(`כמות: ${qty}`);
  if (job.fragile) pkgBits.push("⚠️ שביר");
  const pkgSuffix = pkgBits.length ? ` (${pkgBits.join(" · ")})` : "";
  const packageMain = job.package_type || job.job_type || "משלוח";

  const body =
    `🚚 משלוח זמין (השליחים המועדפים לא לקחו)\n\n` +
    `📦 סוג: ${packageMain}${pkgSuffix}\n` +
    `📍 איסוף: ${pickupLine}\n` +
    `🎯 מסירה: ${dropoffLine}\n` +
    (job.estimated_distance_km ? `📏 מרחק: ${Number(job.estimated_distance_km).toFixed(1)} ק"מ\n` : "") +
    whenLine +
    (job.vehicle_required ? `🚗 רכב: ${job.vehicle_required}\n` : "") +
    (price ? `💰 תשלום: ₪${price}\n` : "") +
    (job.description ? `📝 ${job.description}\n` : "") +
    `\nהשליח הראשון שילחץ "קח את המשלוח" — לוקח את העבודה.`;
  const buttons = [
    { buttonId: `claim:${job.id}:bid`, buttonText: "✅ קח את המשלוח" },
    { buttonId: `claim:${job.id}:skip`, buttonText: "❌ דלג" },
  ];

  const results = await Promise.allSettled(
    matches
      .filter((c) => !!c.whatsapp_phone)
      .map((c) =>
        sendButtons(c.whatsapp_phone!, body, buttons, "GOI").then((res) => ({
          courier: c,
          idMessage:
            res && typeof res === "object" && "idMessage" in (res as object)
              ? String((res as { idMessage?: unknown }).idMessage ?? "")
              : "",
        })),
      ),
  );
  const rows = results
    .map((r) =>
      r.status === "fulfilled"
        ? {
            phone: r.value.courier.whatsapp_phone!,
            courier_id: r.value.courier.id,
            job_id: job.id,
            direction: "outbound",
            delivery_status: "sent",
            body,
            external_message_id: r.value.idMessage || null,
            message_type: "offer_buttons",
            sent_at: now,
            last_status_at: now,
          }
        : null,
    )
    .filter(Boolean) as Array<Record<string, unknown>>;
  if (rows.length) {
    await supabaseAdmin.from("whatsapp_messages").insert(rows as never);
    try {
      const { sendOfferPushToCouriers } = await import("./push/offer-push.server");
      await sendOfferPushToCouriers(job as any, rows.map((r) => String(r.courier_id)));
    } catch (e) {
      console.error("[favorites-fallback] push failed", e);
    }
  }
  return true;
}

async function scanFavoritesFallback() {
  // Find businesses that opted in + their fallback minutes
  const { data: jobs } = await supabaseAdmin
    .from("jobs")
    .select("id, customer_id, favorites_only_dispatched_at")
    .is("selected_courier_id", null)
    .not("favorites_only_dispatched_at", "is", null)
    .eq("favorites_only_fallback_done", false)
    .in("status", ["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו"])
    .limit(200);
  if (!jobs?.length) return 0;

  const bizIds = Array.from(new Set(jobs.map((j) => j.customer_id).filter(Boolean) as string[]));
  const fbMap = new Map<string, number>();
  if (bizIds.length) {
    const { data: biz } = await supabaseAdmin
      .from("customers")
      .select("id, favorites_fallback_minutes")
      .in("id", bizIds);
    for (const b of biz ?? []) {
      fbMap.set(b.id, (b as { favorites_fallback_minutes?: number }).favorites_fallback_minutes ?? 3);
    }
  }

  const nowMs = Date.now();
  let count = 0;
  for (const j of jobs) {
    try {
      const mins = (j.customer_id && fbMap.get(j.customer_id)) || 3;
      const dispatchedMs = j.favorites_only_dispatched_at
        ? Date.parse(j.favorites_only_dispatched_at)
        : 0;
      if (dispatchedMs && nowMs - dispatchedMs >= mins * 60_000) {
        const ok = await runFavoritesFallback(j.id);
        if (ok) count += 1;
      }
    } catch (err) {
      console.error("[favorites-fallback] job failed:", j.id, err);
    }
  }
  return count;
}

export async function runPickupWatchdog() {
  const nowIso = new Date().toISOString();
  // Pull candidate jobs: courier assigned, still in "assigned" stage, business has watchdog on.
  const { data: jobs, error } = await supabaseAdmin
    .from("jobs")
    .select(
      "id, job_number, selected_courier_id, accepted_at, pickup_reminder_sent_at, customer_id, pickup_watchdog_enabled, pickup_reminder_minutes, pickup_redispatch_minutes",
    )
    .not("selected_courier_id", "is", null)
    .eq("delivery_status", "assigned")
    .not("accepted_at", "is", null)
    .in("status", ["נבחר שליח", "פעילה"])
    .limit(200);
  if (error) throw new Error(error.message);

  // Also run the favorites-first fallback scan on the same tick.
  const favoritesFallback = await scanFavoritesFallback().catch((e) => {
    console.error("[favorites-fallback] scan failed:", e);
    return 0;
  });

  if (!jobs?.length) return { reminded: 0, redispatched: 0, scanned: 0, favoritesFallback };

  // Bulk-load owning businesses' settings.
  const businessIds = Array.from(
    new Set(jobs.map((j) => j.customer_id).filter(Boolean) as string[]),
  );
  const settingsMap = new Map<
    string,
    { enabled: boolean; reminder: number; redispatch: number }
  >();
  if (businessIds.length) {
    const { data: biz } = await supabaseAdmin
      .from("customers")
      .select(
        "id, pickup_watchdog_enabled, pickup_reminder_minutes, pickup_redispatch_minutes",
      )
      .in("id", businessIds);
    for (const b of biz ?? []) {
      settingsMap.set(b.id, {
        enabled: (b as { pickup_watchdog_enabled?: boolean }).pickup_watchdog_enabled ?? true,
        reminder: (b as { pickup_reminder_minutes?: number }).pickup_reminder_minutes ?? 5,
        redispatch:
          (b as { pickup_redispatch_minutes?: number }).pickup_redispatch_minutes ?? 5,
      });
    }
  }

  let reminded = 0;
  let redispatched = 0;
  const nowMs = Date.parse(nowIso);
  for (const j of jobs) {
    try {
      const biz = j.customer_id
        ? settingsMap.get(j.customer_id) ?? { enabled: true, reminder: 5, redispatch: 5 }
        : { enabled: true, reminder: 5, redispatch: 5 };
      const jr = j as {
        pickup_watchdog_enabled?: boolean | null;
        pickup_reminder_minutes?: number | null;
        pickup_redispatch_minutes?: number | null;
      };
      const cfg = {
        enabled: jr.pickup_watchdog_enabled ?? biz.enabled,
        reminder: jr.pickup_reminder_minutes ?? biz.reminder,
        redispatch: jr.pickup_redispatch_minutes ?? biz.redispatch,
      };
      if (!cfg.enabled) continue;
      const acceptedMs = j.accepted_at ? Date.parse(j.accepted_at) : 0;
      if (!j.pickup_reminder_sent_at) {
        if (acceptedMs && nowMs - acceptedMs >= cfg.reminder * 60_000) {
          const ok = await sendReminderForJob(j);
          if (ok) reminded += 1;
        }
      } else {
        const remMs = Date.parse(j.pickup_reminder_sent_at);
        if (remMs && nowMs - remMs >= cfg.redispatch * 60_000) {
          const ok = await redispatchJob(j.id);
          if (ok) redispatched += 1;
        }
      }
    } catch (err) {
      console.error("[pickup-watchdog] job failed:", j.id, err);
    }
  }
  return { reminded, redispatched, scanned: jobs.length, favoritesFallback };
}

