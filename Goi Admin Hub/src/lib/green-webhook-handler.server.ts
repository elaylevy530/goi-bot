/**
 * Inbound Green API webhook handler — service-role.
 * Parses messages, matches them to bot state, and updates the DB.
 *
 * Delivery flow (English statuses → matched Hebrew labels in DB):
 *   assigned → heading_to_pickup → arrived_at_pickup → picked_up
 *   → heading_to_dropoff → arrived_at_dropoff → delivered
 *
 * All status transitions go through the `transition_delivery_status` RPC,
 * which validates assignment, current status, and allowed transitions.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendText, sendButtons } from "./green-api.server";
import { renderTemplate } from "./bot-templates.server";

// ─── Hebrew labels ────────────────────────────────────────────────────────
const HE_STATUS: Record<string, string> = {
  open: "ממתין לשליח",
  assigned: "שליח שובץ",
  heading_to_pickup: "יצא לאיסוף",
  arrived_at_pickup: "הגיע לאיסוף",
  picked_up: "המשלוח נאסף",
  heading_to_dropoff: "בדרך ללקוח",
  arrived_at_dropoff: "הגיע ללקוח",
  delivered: "נמסר",
};

// ─── Google Maps URL builder ──────────────────────────────────────────────
function mapsUrl(address?: string | null, lat?: number | null, lng?: number | null) {
  if (lat && lng) return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  if (address) return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  return "";
}

async function loadJob(jobId: string) {
  const { data } = await supabaseAdmin.from("jobs").select("*").eq("id", jobId).maybeSingle();
  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function dropoffExtras(j: any): string {
  const bits: string[] = [];
  if (j.dropoff_building) bits.push(`בניין ${j.dropoff_building}`);
  if (j.dropoff_entrance) bits.push(`כניסה ${j.dropoff_entrance}`);
  if (j.dropoff_floor) bits.push(`קומה ${j.dropoff_floor}`);
  if (j.dropoff_apartment) bits.push(`דירה ${j.dropoff_apartment}`);
  return bits.join(" · ");
}

async function loadBusinessInfo(j: any): Promise<{
  name: string;
  pickupContactName: string;
  pickupContactPhone: string;
}> {
  const fallback = {
    name: (j.customer_name as string) || "",
    pickupContactName: (j.pickup_contact_name as string) || "",
    pickupContactPhone: (j.pickup_contact_phone as string) || "",
  };
  if (!j.customer_id) return fallback;
  const { data } = await supabaseAdmin
    .from("customers")
    .select("business_name, name, pickup_contact_name, pickup_contact_phone, phone")
    .eq("id", j.customer_id)
    .maybeSingle();
  const c = data as any;
  return {
    name: fallback.name || c?.business_name || c?.name || "",
    pickupContactName: fallback.pickupContactName || c?.pickup_contact_name || c?.name || "",
    pickupContactPhone: fallback.pickupContactPhone || c?.pickup_contact_phone || c?.phone || "",
  };
}

// ─── Stage-1 message: full pickup + dropoff brief + first action button ──
async function sendAssignedBriefing(phone: string, jobId: string) {
  const j = await loadJob(jobId);
  if (!j) return;
  const pickupNav = mapsUrl(j.pickup_address, j.pickup_lat, j.pickup_lng);
  const dropNav = mapsUrl(j.dropoff_address, j.dropoff_lat, j.dropoff_lng);

  const pickupFull = [j.pickup_address, j.pickup_area].filter(Boolean).join(", ") || "—";
  const dropoffFull = [j.dropoff_address, j.dropoff_area].filter(Boolean).join(", ") || "—";
  const dropExtras = dropoffExtras(j);
  const businessInfo = await loadBusinessInfo(j);
  const businessName = businessInfo.name;
  const pickupContactName = businessInfo.pickupContactName;
  const pickupContactPhone = businessInfo.pickupContactPhone;
  const distance = j.estimated_distance_km ?? j.distance_km;
  const distanceStr = distance ? Number(distance).toFixed(1) : "";
  const earnings = j.payment ?? j.suggested_courier_payment ?? j.final_price ?? j.customer_price;

  const fallbackBody =
    `✅ המשלוח שוריין עבורך!\n\n` +
    `מספר משלוח: #${j.job_number ?? jobId.slice(0, 8)}\n\n` +
    `📍 פרטי איסוף\n` +
    `כתובת: ${pickupFull}\n` +
    (businessName ? `🏢 עסק: ${businessName}\n` : "") +
    (pickupContactName ? `👤 איש קשר: ${pickupContactName}\n` : "") +
    (pickupContactPhone ? `📞 ${pickupContactPhone}\n` : "") +
    (j.pickup_notes ? `📝 הערות: ${j.pickup_notes}\n` : "") +
    (pickupNav ? `🧭 ניווט: ${pickupNav}\n` : "") +
    `\n━━━━━━━━━━━━━━\n\n` +
    `🎯 פרטי מסירה\n` +
    `כתובת: ${dropoffFull}\n` +
    (dropExtras ? `🏠 ${dropExtras}\n` : "") +
    (j.recipient_name ? `👤 מקבל: ${j.recipient_name}\n` : "") +
    (j.recipient_phone ? `📞 ${j.recipient_phone}\n` : "") +
    (j.dropoff_notes ? `📝 הערות: ${j.dropoff_notes}\n` : "") +
    (dropNav ? `🧭 ניווט: ${dropNav}\n` : "") +
    `\n━━━━━━━━━━━━━━\n` +
    (j.package_type ? `📦 סוג: ${j.package_type}\n` : "") +
    (distanceStr ? `📏 מרחק: ${distanceStr} ק״מ\n` : "") +
    (j.delivery_deadline
      ? `🎯 מסירה עד: ${new Date(j.delivery_deadline).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}\n`
      : "") +
    (earnings ? `💰 תשלום לשליח: ₪${earnings}\n` : "");

  const vars = {
    job_id: jobId,
    job_number: j.job_number ?? jobId.slice(0, 8),
    pickup: pickupFull,
    dropoff: dropoffFull,
    pickup_address: pickupFull,
    dropoff_address: dropoffFull,
    dropoff_extras: dropExtras,
    dropoff_apartment: j.dropoff_apartment ?? "",
    dropoff_floor: j.dropoff_floor ?? "",
    dropoff_entrance: j.dropoff_entrance ?? "",
    dropoff_building: j.dropoff_building ?? "",
    business_name: businessName,
    pickup_nav: pickupNav,
    dropoff_nav: dropNav,
    pickup_contact_name: pickupContactName,
    pickup_contact_phone: pickupContactPhone,
    pickup_notes: j.pickup_notes ?? "",
    dropoff_notes: j.dropoff_notes ?? "",
    recipient_name: j.recipient_name ?? "",
    recipient_phone: j.recipient_phone ?? "",
    package_type: j.package_type ?? "",
    distance_km: distanceStr,
    payment: earnings ?? "",
    price: earnings ?? "",
    earnings: earnings ?? "",
    customer_name: businessName,
    deadline: j.delivery_deadline
      ? new Date(j.delivery_deadline).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
      : "",
  };
  const rendered = await renderTemplate("delivery_assigned", vars, {
    body: fallbackBody,
    buttons: [{ buttonId: `delivery_heading_to_pickup:${jobId}`, buttonText: "🚀 יצאתי לאיסוף" }],
  });
  await sendButtons(phone, rendered.body, rendered.buttons, "GOI");
}

// ─── Per-stage prompts after each successful transition ──────────────────
async function sendStagePrompt(phone: string, jobId: string, newStatus: string) {
  const j = await loadJob(jobId);
  if (!j) return;
  const pickupNav = mapsUrl(j.pickup_address, j.pickup_lat, j.pickup_lng);
  const dropNav = mapsUrl(j.dropoff_address, j.dropoff_lat, j.dropoff_lng);
  const pickupFull = [j.pickup_address, j.pickup_area].filter(Boolean).join(", ") || "—";
  const dropoffFull = [j.dropoff_address, j.dropoff_area].filter(Boolean).join(", ") || "—";
  const dropExtras = dropoffExtras(j);
  const businessInfo = await loadBusinessInfo(j);
  const businessName = businessInfo.name;
  const pickupContactName = businessInfo.pickupContactName;
  const pickupContactPhone = businessInfo.pickupContactPhone;
  const earnings = j.payment ?? j.suggested_courier_payment ?? j.final_price ?? j.customer_price;
  const vars = {
    job_id: jobId,
    job_number: j.job_number ?? jobId.slice(0, 8),
    pickup: pickupFull,
    dropoff: dropoffFull,
    pickup_address: pickupFull,
    dropoff_address: dropoffFull,
    dropoff_extras: dropExtras,
    dropoff_apartment: j.dropoff_apartment ?? "",
    dropoff_floor: j.dropoff_floor ?? "",
    dropoff_entrance: j.dropoff_entrance ?? "",
    dropoff_building: j.dropoff_building ?? "",
    business_name: businessName,
    customer_name: businessName,
    pickup_contact_name: pickupContactName,
    pickup_contact_phone: pickupContactPhone,
    pickup_notes: j.pickup_notes ?? "",
    pickup_nav: pickupNav,
    dropoff_nav: dropNav,
    recipient_name: j.recipient_name ?? "",
    recipient_phone: j.recipient_phone ?? "",
    dropoff_notes: j.dropoff_notes ?? "",
    payment: earnings ?? "",
    price: earnings ?? "",
    earnings: earnings ?? "",
  };

  switch (newStatus) {
    case "heading_to_pickup": {
      const r = await renderTemplate("delivery_heading_to_pickup", vars, {
        body:
          `🚀 יצאת לאיסוף\n\n` +
          `📍 כתובת איסוף: ${pickupFull}\n` +
          (businessName ? `🏢 עסק: ${businessName}\n` : "") +
          (pickupContactName ? `👤 איש קשר: ${pickupContactName}\n` : "") +
          (pickupContactPhone ? `📞 ${pickupContactPhone}\n` : "") +
          (j.pickup_notes ? `📝 ${j.pickup_notes}\n` : "") +
          (pickupNav ? `\n🧭 ניווט: ${pickupNav}\n` : "") +
          `\nכשתאסוף את החבילה, לחץ:`,
        buttons: [{ buttonId: `delivery_picked_up:${jobId}`, buttonText: "📦 אספתי" }],
      });
      await sendButtons(phone, r.body, r.buttons, "GOI");
      return;
    }
    case "picked_up": {
      const r = await renderTemplate("delivery_picked_up", vars, {
        body:
          `📦 המשלוח נאסף\n\n🎯 כתובת מסירה: ${dropoffFull}\n` +
          (dropExtras ? `🏠 ${dropExtras}\n` : "") +
          (j.recipient_name ? `👤 מקבל: ${j.recipient_name}\n` : "") +
          (j.recipient_phone ? `📞 ${j.recipient_phone}\n` : "") +
          (j.dropoff_notes ? `📝 ${j.dropoff_notes}\n` : "") +
          `\n🧭 ניווט: ${dropNav}\n\nלאחר מסירה ללקוח, לחץ:`,
        buttons: [{ buttonId: `delivery_delivered:${jobId}`, buttonText: "✅ נמסר" }],
      });
      await sendButtons(phone, r.body, r.buttons, "GOI");
      return;
    }

    case "delivered": {
      const r = await renderTemplate("delivery_delivered", vars, {
        body:
          `✅ המשלוח הושלם בהצלחה!\n\n` +
          `מספר משלוח: #${j.job_number ?? jobId.slice(0, 8)}\n` +
          (earnings ? `💰 הרווחת: ₪${earnings}\n` : "") +
          `\nתודה על העבודה! 🙌`,
      });
      await sendText(phone, r.body);
      return;
    }
    case "arrived_at_pickup":
      await sendButtons(
        phone,
        `📍 הגעת לנקודת האיסוף\n\n` +
          `כתובת: ${pickupFull}\n` +
          (businessName ? `🏢 עסק: ${businessName}\n` : "") +
          (pickupContactName ? `👤 איש קשר: ${pickupContactName}\n` : "") +
          (pickupContactPhone ? `📞 ${pickupContactPhone}\n` : "") +
          (j.pickup_notes ? `📝 הערות: ${j.pickup_notes}\n` : "") +
          `\nכשתאסוף את החבילה, לחץ:`,
        [{ buttonId: `delivery_picked_up:${jobId}`, buttonText: "📦 אספתי" }],
        "GOI",
      );
      return;
    case "heading_to_dropoff":
    case "arrived_at_dropoff":
      await sendButtons(
        phone,
        `🛵 בדרך ללקוח\n\n` +
          `🎯 כתובת מסירה: ${dropoffFull}\n` +
          (dropExtras ? `🏠 ${dropExtras}\n` : "") +
          (j.recipient_name ? `👤 מקבל: ${j.recipient_name}\n` : "") +
          (j.recipient_phone ? `📞 ${j.recipient_phone}\n` : "") +
          (j.dropoff_notes ? `📝 הערות: ${j.dropoff_notes}\n` : "") +
          (dropNav ? `\n🧭 ניווט: ${dropNav}\n` : "") +
          `\nלאחר מסירה, לחץ:`,
        [{ buttonId: `delivery_delivered:${jobId}`, buttonText: "✅ נמסר" }],
        "GOI",
      );
      return;
  }
}

// ─── Notify the end-recipient via WhatsApp on key status changes ─────────
async function notifyRecipientOfStatus(jobId: string, newStatus: string) {
  if (!["heading_to_pickup", "picked_up", "delivered"].includes(newStatus)) return;
  const { data: j } = await supabaseAdmin
    .from("jobs")
    .select(
      "job_number, recipient_phone, recipient_name, notify_recipient, customer_id, customer_name, recipient_tracking_token, package_type",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (!j?.recipient_phone) return;

  // Admin gate: recipient WhatsApp updates require admin approval per business
  // (each message has a real cost on the official WhatsApp API).
  let allowed = false;
  let enabled: boolean | null | undefined = (j as { notify_recipient?: boolean | null }).notify_recipient;
  if (j.customer_id) {
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("notify_recipient_allowed, notify_recipient_enabled, business_name, name")
      .eq("id", j.customer_id)
      .maybeSingle();
    allowed = (cust as { notify_recipient_allowed?: boolean } | null)?.notify_recipient_allowed === true;
    if (enabled === null || enabled === undefined) {
      enabled = (cust as { notify_recipient_enabled?: boolean } | null)?.notify_recipient_enabled ?? false;
    }
  }
  if (!allowed) return;
  if (!enabled) return;

  const senderLabel = j.customer_name || "העסק";
  const itemLabel = j.package_type || "המשלוח";
  const trackUrl = (j as { recipient_tracking_token?: string | null }).recipient_tracking_token
    ? `https://goi-bot.lovable.app/track/${(j as { recipient_tracking_token?: string | null }).recipient_tracking_token}`
    : "";
  const hi = j.recipient_name ? `שלום ${j.recipient_name},\n` : "";

  let body = "";
  if (newStatus === "heading_to_pickup") {
    body =
      `${hi}🚀 השליח של ${senderLabel} בדרך לאסוף את ${itemLabel} שלך.\n` +
      `נעדכן אותך ברגע שהוא ייצא לכיוונך.`;
  } else if (newStatus === "picked_up") {
    body =
      `${hi}📦 השליח של ${senderLabel} אסף את ${itemLabel} ובדרך אליך כעת.`;
  } else if (newStatus === "delivered") {
    body =
      `${hi}✅ ${itemLabel} שלך נמסר. תודה שבחרת ב-${senderLabel}!`;
  }
  if (trackUrl && newStatus !== "delivered") {
    body += `\n\n📍 מעקב חי במפה:\n${trackUrl}`;
  }

  try {
    const res = (await sendText(j.recipient_phone, body)) as { idMessage?: string } | undefined;
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("whatsapp_messages").insert({
      phone: j.recipient_phone,
      job_id: jobId,
      direction: "outbound",
      delivery_status: "sent",
      body,
      external_message_id: res?.idMessage ?? null,
      message_type: `recipient_${newStatus}`,
      sent_at: nowIso,
      last_status_at: nowIso,
    } as never);
  } catch (e) {
    console.error("[notify-recipient] failed", jobId, newStatus, e);
  }
}



// ─── Webhook payload shape ───────────────────────────────────────────────
type WebhookBody = Record<string, unknown> & {
  typeWebhook?: string;
  idMessage?: string;
  senderData?: { chatId?: string; sender?: string };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
    buttonsResponseMessage?: { selectedButtonId?: string; selectedButtonText?: string };
    templateButtonReplyMessage?: { selectedId?: string; selectedDisplayText?: string };
    interactiveButtonsReplyMessage?: { selectedButtonId?: string; selectedButtonText?: string };
    interactiveButtonsResponseMessage?: { selectedButtonId?: string; selectedButtonText?: string };
    interactiveButtonsResponse?: { selectedId?: string; selectedDisplayText?: string; selectedButtonId?: string; selectedButtonText?: string };
    interactiveResponseMessage?: { selectedButtonId?: string; selectedButtonText?: string };
    listResponseMessage?: { listType?: string; singleSelectReply?: { selectedRowId?: string; title?: string } };
    locationMessageData?: { latitude?: number; longitude?: number; nameLocation?: string; address?: string };
    fileMessageData?: { downloadUrl?: string; caption?: string; mimeType?: string; fileName?: string };
  };
};

function chatIdToPhone(chatId?: string): string | null {
  if (!chatId) return null;
  const m = chatId.match(/^(\d+)@/);
  return m ? m[1] : null;
}

function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const variants = new Set<string>([digits]);
  if (digits.startsWith("972")) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(`+${digits}`);
  }
  if (digits.startsWith("0")) {
    variants.add(`972${digits.slice(1)}`);
    variants.add(`+972${digits.slice(1)}`);
  }
  return Array.from(variants).filter(Boolean);
}

async function findCourierByPhone(phone: string) {
  // First: exact variant match (fast path)
  const variants = phoneVariants(phone);
  const { data: exact } = await supabaseAdmin
    .from("couriers")
    .select("id, full_name, whatsapp_phone, courier_status, is_paused")
    .in("whatsapp_phone", variants)
    .maybeSingle();
  if (exact) return exact;
  // Fallback: some couriers have invisible RTL marks / spaces / dashes
  // saved into whatsapp_phone. Compare digit-only suffix (last 9).
  const digits = phone.replace(/\D/g, "");
  const suffix = digits.slice(-9);
  if (!suffix) return null;
  const { data: all } = await supabaseAdmin
    .from("couriers")
    .select("id, full_name, whatsapp_phone, courier_status, is_paused")
    .not("whatsapp_phone", "is", null);
  return (all ?? []).find((c) => (c.whatsapp_phone ?? "").replace(/\D/g, "").endsWith(suffix)) ?? null;
}

function extractText(b: WebhookBody): string {
  const m = b.messageData ?? {};
  return (
    m.textMessageData?.textMessage ??
    m.extendedTextMessageData?.text ??
    m.buttonsResponseMessage?.selectedButtonText ??
    m.templateButtonReplyMessage?.selectedDisplayText ??
    m.interactiveButtonsReplyMessage?.selectedButtonText ??
    m.interactiveButtonsResponseMessage?.selectedButtonText ??
    m.interactiveButtonsResponse?.selectedButtonText ??
    m.interactiveButtonsResponse?.selectedDisplayText ??
    m.interactiveResponseMessage?.selectedButtonText ??
    m.listResponseMessage?.singleSelectReply?.title ??
    ""
  ).trim();
}

function extractButtonId(b: WebhookBody): string | null {
  const m = b.messageData ?? {};
  return (
    m.buttonsResponseMessage?.selectedButtonId ??
    m.templateButtonReplyMessage?.selectedId ??
    m.interactiveButtonsReplyMessage?.selectedButtonId ??
    m.interactiveButtonsResponseMessage?.selectedButtonId ??
    m.interactiveButtonsResponse?.selectedButtonId ??
    m.interactiveButtonsResponse?.selectedId ??
    m.interactiveResponseMessage?.selectedButtonId ??
    m.listResponseMessage?.singleSelectReply?.selectedRowId ??
    null
  );
}

function cleanActionText(text: string): string {
  return text.replace(/[✅❌🚀📍📦🛵]/g, "").replace(/\s+/g, " ").trim();
}

function isTakeOfferText(text: string): boolean {
  const t = cleanActionText(text);
  return /^(1|קח|לקח|כן|מאשר)$/i.test(t) || t.includes("קח את המשלוח");
}

function isSkipOfferText(text: string): boolean {
  const t = cleanActionText(text);
  return /^(2|דלג|דחה|לא)$/i.test(t);
}

function deliveryStatusFromText(text: string): string | null {
  const t = cleanActionText(text);
  if (t.includes("יצאתי לאיסוף")) return "heading_to_pickup";
  if (t.includes("הגעתי לאיסוף")) return "arrived_at_pickup";
  if (t.includes("אספתי")) return "picked_up";
  if (t.includes("יצאתי למסירה")) return "heading_to_dropoff";
  if (t.includes("הגעתי ללקוח")) return "arrived_at_dropoff";
  if (t.includes("המשלוח נמסר") || t === "נמסר") return "delivered";
  return null;
}

async function getLatestState(phone: string) {
  const { data } = await supabaseAdmin
    .from("wa_bot_state")
    .select("*")
    .eq("phone", phone)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
async function clearState(id: string) {
  await supabaseAdmin.from("wa_bot_state").delete().eq("id", id);
}
async function setState(phone: string, state: string, fields: Record<string, unknown>) {
  await supabaseAdmin.from("wa_bot_state").insert({ phone, state, ...fields });
}

async function submitQuoteAsBot(jobId: string, courierId: string, price: number) {
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, customer_id, pricing_type, selected_quote_id, quote_deadline_at, status")
    .eq("id", jobId)
    .single();
  if (!job) throw new Error("job missing");
  if (job.pricing_type !== "quote_request") throw new Error("not quote_request");
  if (job.selected_quote_id) throw new Error("already selected");
  if (job.quote_deadline_at && new Date(job.quote_deadline_at) < new Date()) throw new Error("deadline passed");
  const { data: stats } = await supabaseAdmin
    .from("courier_stats")
    .select("avg_rating, jobs_completed, avg_response_seconds")
    .eq("courier_id", courierId)
    .maybeSingle();
  const { error } = await supabaseAdmin.from("job_quotes").upsert(
    {
      job_id: jobId,
      courier_id: courierId,
      customer_id: job.customer_id,
      price,
      status: "pending",
      courier_rating_snapshot: stats?.avg_rating ?? null,
      courier_completed_jobs_snapshot: stats?.jobs_completed ?? null,
      courier_response_time_snapshot: stats?.avg_response_seconds ?? null,
    },
    { onConflict: "job_id,courier_id" },
  );
  if (error) throw new Error(error.message);
  await supabaseAdmin.rpc("refresh_quote_shortlist", { _job_id: jobId });
  await maybeNotifyCustomer(jobId);
}

async function maybeNotifyCustomer(jobId: string) {
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, customer_id, pickup_address, dropoff_address, selected_quote_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.selected_quote_id) return;
  const { data: customer } = await supabaseAdmin.from("customers").select("id, phone").eq("id", job.customer_id!).maybeSingle();
  if (!customer?.phone) return;
  const { data: quotes } = await supabaseAdmin
    .from("job_quotes")
    .select("id, price, estimated_arrival_minutes, courier_rating_snapshot, couriers(full_name)")
    .eq("job_id", jobId)
    .eq("status", "shortlisted")
    .order("price", { ascending: true })
    .limit(3);
  if (!quotes?.length) return;
  const { data: recent } = await supabaseAdmin
    .from("wa_bot_state")
    .select("id, created_at")
    .eq("phone", customer.phone)
    .eq("state", "awaiting_customer_selection")
    .gt("created_at", new Date(Date.now() - 2 * 60_000).toISOString())
    .maybeSingle();
  if (recent) return;
  const lines = quotes
    .map((q, i) => {
      const name = (q.couriers as { full_name?: string } | null)?.full_name ?? "שליח";
      const rating = q.courier_rating_snapshot ? `⭐ ${Number(q.courier_rating_snapshot).toFixed(1)}` : "";
      const eta = q.estimated_arrival_minutes ? `🕒 ${q.estimated_arrival_minutes} דק'` : "";
      return `${i + 1}. ${name} — ₪${q.price} ${rating} ${eta}`;
    })
    .join("\n");
  const msg = `📋 התקבלו הצעות למשלוח שלך:\n📍 ${job.pickup_address || ""} → ${job.dropoff_address || ""}\n\n${lines}\n\nבחר הצעה לאישור:`;
  try {
    await sendButtons(
      customer.phone,
      msg,
      quotes.map((q, i) => ({ buttonId: `select:${jobId}:${q.id}`, buttonText: `אשר ${i + 1} (₪${q.price})` })),
      "GOI",
    );
    await supabaseAdmin.from("wa_bot_state").insert({
      phone: customer.phone,
      state: "awaiting_customer_selection",
      job_id: jobId,
      customer_id: customer.id,
      payload: { quote_ids: quotes.map((q) => q.id) },
    });
  } catch (e) {
    console.error("notify customer failed", e);
  }
}

// ─── Central transition runner ────────────────────────────────────────────
async function runTransition(
  phone: string,
  jobId: string,
  courierId: string,
  newStatus: string,
  externalMessageId?: string,
) {
  const { data, error } = await supabaseAdmin.rpc("transition_delivery_status", {
    _job_id: jobId,
    _courier_id: courierId,
    _requested_status: newStatus,
    _action_source: "whatsapp",
    _external_message_id: externalMessageId,
    _metadata: {},
  });
  if (error) {
    console.error("[delivery-transition] rpc error:", error);
    try { await sendText(phone, `⚠️ שגיאה זמנית. נסה שוב בעוד רגע.`); } catch {}
    return;
  }
  const res = (data ?? {}) as { ok?: boolean; reason?: string; duplicate?: boolean; status?: string };
  if (res.duplicate) return; // ignore duplicate webhooks
  if (!res.ok) {
    let he = "—";
    try {
      const { data: cur } = await supabaseAdmin.from("jobs").select("delivery_status").eq("id", jobId).maybeSingle();
      he = HE_STATUS[cur?.delivery_status ?? ""] ?? "—";
    } catch (err) {
      console.error("[delivery-transition] status lookup failed:", err);
    }
    try { await sendText(phone, `הפעולה הזו כבר אינה זמינה.\n\nהסטטוס הנוכחי של המשלוח: ${he}`); } catch {}
    return;
  }
  try {
    await sendStagePrompt(phone, jobId, newStatus);
  } catch (err) {
    console.error("[delivery-transition] stage prompt failed:", err);
  }
  try {
    await notifyRecipientOfStatus(jobId, newStatus);
  } catch (err) {
    console.error("[notify-recipient] dispatch failed:", err);
  }
  try {
    const { notifyBusinessJobStatus } = await import("./push/business-status-push.server");
    await notifyBusinessJobStatus(jobId, newStatus);
  } catch (err) {
    console.error("[notify-business-status] dispatch failed:", err);
  }



}


async function handleFixedPriceClaim(phone: string, jobId: string, action: string, messageId?: string) {
  const courier = await findCourierByPhone(phone);
  if (!courier) {
    await sendText(phone, "לא מצאנו פרופיל שליח עבור המספר הזה.");
    return;
  }
  if (action === "skip") {
    await supabaseAdmin
      .from("offer_events")
      .update({ response: "declined", responded_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .eq("courier_id", courier.id)
      .eq("response", "pending");
    await supabaseAdmin
      .from("courier_job_declines")
      .upsert({ courier_id: courier.id, job_id: jobId }, { onConflict: "courier_id,job_id" });
    await sendText(phone, (await renderTemplate("skip_acknowledged", {}, { body: "אין בעיה, סימנו שדילגת על המשלוח הזה 👋" })).body);
    return;
  }
  // Claim atomically via RPC — it returns ok:false with reason if already taken.
  const { data: result, error } = await supabaseAdmin.rpc("courier_claim_job_as_bot", {
    _job_id: jobId,
    _courier_id: courier.id,
    _source: "whatsapp",
  });
  if (error) {
    await sendText(phone, `⚠️ ${error.message}`);
    return;
  }
  if ((result as { ok?: boolean })?.ok === false) {
    const reason = (result as { reason?: string }).reason;
    if (reason === "already_yours") {
      await sendAssignedBriefing(phone, jobId);
      return;
    }
    const takenMsg = (await renderTemplate("job_taken_already", {}, { body: "⚠️ המשלוח כבר נתפס." })).body;
    await sendText(phone, reason === "taken" ? takenMsg : "⚠️ המשלוח כבר לא זמין.");
    return;
  }

  try {
    await sendAssignedBriefing(phone, jobId);
  } catch (err) {
    console.error("[claim] assigned briefing failed:", err);
  }
  try {
    const { notifyBusinessJobStatus } = await import("./push/business-status-push.server");
    await notifyBusinessJobStatus(jobId, "assigned");
  } catch (err) {
    console.error("[claim] notify-business-status failed:", err);
  }

}


// ─── Main webhook entry ──────────────────────────────────────────────────
async function markEvent(
  eventId: string | undefined,
  fields: Record<string, unknown>,
) {
  if (!eventId) return;
  try {
    await supabaseAdmin
      .from("green_api_webhook_events")
      .update({ ...fields, processed_at: new Date().toISOString() })
      .eq("id", eventId);
  } catch (e) {
    console.error("markEvent failed", e);
  }
}

export async function handleGreenWebhook(body: WebhookBody, eventId?: string) {
  // ─── Outgoing message status updates (sent / delivered / read / failed) ───
  // Green API delivers these as typeWebhook="outgoingMessageStatus" with
  // { idMessage, status }. We mirror the status onto whatsapp_messages so the
  // admin panel can show per-job delivery state.
  if (body.typeWebhook === "outgoingMessageStatus") {
    const raw = body as Record<string, unknown>;
    const idMessage = (raw.idMessage as string) ?? null;
    const rawStatus = String(raw.status ?? "").toLowerCase();
    if (idMessage && rawStatus) {
      const map: Record<string, string> = {
        sent: "sent",
        delivered: "delivered",
        read: "read",
        failed: "failed",
        noaccount: "failed",
        notdelivered: "failed",
      };
      const mapped = map[rawStatus];
      if (mapped) {
        const now = new Date().toISOString();
        const patch: Record<string, unknown> = {
          delivery_status: mapped,
          last_status_at: now,
        };
        if (mapped === "sent") patch.sent_at = now;
        if (mapped === "delivered") patch.delivered_at = now;
        if (mapped === "read") patch.read_at = now;
        if (mapped === "failed") {
          patch.failed_at = now;
          patch.error_text = (raw.description as string) ?? rawStatus;
        }
        const { error } = await supabaseAdmin
          .from("whatsapp_messages")
          .update(patch as never)
          .eq("external_message_id", idMessage);
        if (error) console.error("[green-webhook] status update failed", error.message);
      }
    }
    await markEvent(eventId, {
      processing_status: "completed",
      processing_error: `outgoingMessageStatus=${rawStatus}`,
      processed_at: new Date().toISOString(),
    });
    return;
  }

  // Normally we only process inbound messages. But when the courier's WhatsApp
  // number is the same number linked to the Green API instance (typical in
  // testing / single-account setups), Green API tags the courier's button taps
  // as `outgoingMessageReceived` (the bot account "sent" the button reply to
  // itself). In that case we still want to process button interactions so
  // claim/skip/status updates work. Plain outgoing texts stay ignored to
  // avoid the bot replying to its own outbound messages.
  const isInbound = body.typeWebhook === "incomingMessageReceived";
  const isSelfButtonTap =
    body.typeWebhook === "outgoingMessageReceived" &&
    (body.messageData?.typeMessage === "interactiveButtonsResponse" ||
      body.messageData?.typeMessage === "buttonsResponseMessage" ||
      body.messageData?.typeMessage === "templateButtonReplyMessage" ||
      body.messageData?.typeMessage === "listResponseMessage" ||
      !!extractButtonId(body));
  if (!isInbound && !isSelfButtonTap) {
    await markEvent(eventId, { processing_status: "ignored", processing_error: `typeWebhook=${body.typeWebhook}` });
    return;
  }

  const phone = chatIdToPhone(body.senderData?.chatId);
  if (!phone) {
    await markEvent(eventId, { processing_status: "ignored", processing_error: "no_phone" });
    return;
  }

  const buttonId = extractButtonId(body);
  const text = extractText(body);
  let statePromise: ReturnType<typeof getLatestState> | null = null;
  const loadState = () => {
    statePromise ??= getLatestState(phone);
    return statePromise;
  };
  const messageId = body.idMessage;
  await markEvent(eventId, { processing_status: "processing" });

  const deliveryStatusByText = buttonId ? null : deliveryStatusFromText(text);
  if (deliveryStatusByText) {
    const courier = await findCourierByPhone(phone);
    if (!courier) {
      await sendText(phone, "לא מצאנו פרופיל שליח עבור המספר הזה.");
      return;
    }
    const { data: job } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!job?.id) {
      await sendText(phone, "אין לך כרגע משלוח פעיל לעדכון.");
      return;
    }
    await runTransition(phone, job.id, courier.id, deliveryStatusByText, messageId);
    return;
  }

  // === Delivery flow buttons ===
  if (buttonId?.startsWith("delivery_")) {
    const [action, jobId] = buttonId.split(":");
    const map: Record<string, string> = {
      delivery_heading_to_pickup: "heading_to_pickup",
      delivery_arrived_at_pickup: "arrived_at_pickup",
      delivery_picked_up: "picked_up",
      delivery_heading_to_dropoff: "heading_to_dropoff",
      delivery_arrived_at_dropoff: "arrived_at_dropoff",
      delivery_delivered: "delivered",
    };
    const next = map[action];
    if (!next || !jobId) return;
    const courier = await findCourierByPhone(phone);
    if (!courier) {
      await sendText(phone, "לא מצאנו פרופיל שליח עבור המספר הזה.");
      return;
    }
    await runTransition(phone, jobId, courier.id, next, messageId);
    return;
  }

  // === Quote bid buttons ===
  if (buttonId?.startsWith("quote:")) {
    const parts = buttonId.split(":");
    const jobId = parts[1];
    const action = parts[2];
    const priceFromBtn = parts[3] ? parseFloat(parts[3]) : NaN;
    if (action === "skip") {
      const state = await loadState();
      if (state) await clearState(state.id);
      await sendText(phone, "אין בעיה, בהצלחה בעבודה הבאה 👋");
      return;
    }
    if (action === "bid") {
      const courier = await findCourierByPhone(phone);
      if (!courier) {
        await sendText(phone, "לא מצאנו פרופיל שליח עבור המספר הזה.");
        return;
      }
      if (isFinite(priceFromBtn) && priceFromBtn > 0) {
        try {
          await submitQuoteAsBot(jobId, courier.id, priceFromBtn);
          const state = await loadState();
          if (state) await clearState(state.id);
          await sendText(phone, `✅ ההצעה שלך (₪${priceFromBtn}) נשלחה. בהצלחה!`);
        } catch (e) {
          await sendText(phone, `⚠️ ${e instanceof Error ? e.message : "שגיאה"}`);
        }
        return;
      }
      const state = await loadState();
      if (state) await clearState(state.id);
      await setState(phone, "awaiting_price", { job_id: jobId, courier_id: courier.id });
      await sendText(phone, "🎯 כמה אתה רוצה על העבודה? כתוב מספר בלבד (לדוגמה: 80)");
      return;
    }
  }

  // === Customer selects a quote ===
  if (buttonId?.startsWith("select:")) {
    const [, jobId, quoteId] = buttonId.split(":");
    const { data: q } = await supabaseAdmin
      .from("job_quotes")
      .select("id, price, courier_id, couriers(full_name, whatsapp_phone)")
      .eq("id", quoteId)
      .maybeSingle();
    if (!q) {
      await sendText(phone, "ההצעה כבר לא זמינה.");
      return;
    }
    const { error } = await supabaseAdmin.rpc("select_job_quote", { _quote_id: quoteId });
    if (error) {
      await sendText(phone, `שגיאה בבחירה: ${error.message}`);
      return;
    }
    const state = await loadState();
    if (state) await clearState(state.id);
    const courier = q.couriers as { full_name?: string; whatsapp_phone?: string } | null;
    await sendText(phone, `✅ בחרת את ${courier?.full_name ?? "השליח"} (₪${q.price}). השליח קיבל הודעה.`);
    if (courier?.whatsapp_phone) {
      // Kick off the assigned-courier briefing
      await supabaseAdmin
        .from("jobs")
        .update({ delivery_status: "assigned", courier_step: "שליח אישר", accepted_at: new Date().toISOString(), current_status_updated_at: new Date().toISOString() })
        .eq("id", jobId);
      await sendAssignedBriefing(courier.whatsapp_phone, jobId);
      try {
        const { notifyBusinessJobStatus } = await import("./push/business-status-push.server");
        await notifyBusinessJobStatus(jobId, "assigned");
      } catch (err) {
        console.error("[quote-select] notify-business-status failed:", err);
      }
    }

    return;
  }

  // === Fixed-price claim buttons ===
  if (buttonId?.startsWith("claim:")) {
    const [, jobId, action] = buttonId.split(":");
    await handleFixedPriceClaim(phone, jobId, action, messageId);
    return;
  }

  // === Release assigned job (from pickup-watchdog reminder) ===
  if (buttonId?.startsWith("release_job:")) {
    const jobId = buttonId.split(":")[1];
    const courier = await findCourierByPhone(phone);
    if (!courier) { await sendText(phone, "לא מצאנו פרופיל שליח."); return; }
    const { data: job } = await supabaseAdmin
      .from("jobs").select("id, selected_courier_id, job_number").eq("id", jobId).single();
    if (!job || job.selected_courier_id !== courier.id) {
      await sendText(phone, "המשלוח כבר לא משויך אליך.");
      return;
    }
    await supabaseAdmin.from("jobs").update({
      selected_courier_id: null,
      status: "נשלחה לשליחים",
      delivery_status: null,
      courier_step: null,
      accepted_at: null,
      pickup_reminder_sent_at: null,
      pickup_redispatched_at: new Date().toISOString(),
    } as never).eq("id", jobId);
    await supabaseAdmin.from("offer_events").update({
      response: "cancelled", responded_at: new Date().toISOString(),
    } as never).eq("job_id", jobId).eq("courier_id", courier.id);
    await sendText(phone, `שוחרר. נשלח את המשלוח ${job.job_number ? `#${job.job_number}` : ""} לשליחים אחרים.`);
    // Re-dispatch in the background
    try {
      const { redispatchJob } = await import("./pickup-watchdog.server");
      await redispatchJob(jobId);
    } catch (e) {
      console.error("[release_job] redispatch failed", e);
    }
    return;
  }



  // === Awaiting price free-text ===
  const state = await loadState();
  if (state?.state === "awaiting_price") {
    const num = parseFloat(text.replace(/[^\d.]/g, ""));
    if (!isFinite(num) || num <= 0) {
      await sendText(phone, "לא הבנתי את המחיר. כתוב מספר בלבד.");
      return;
    }
    try {
      await submitQuoteAsBot(state.job_id as string, state.courier_id as string, num);
      await clearState(state.id);
      await sendText(phone, `✅ ההצעה שלך (₪${num}) נשלחה. בהצלחה!`);
    } catch (e) {
      await sendText(phone, `⚠️ ${e instanceof Error ? e.message : "שגיאה"}`);
    }
    return;
  }

  // === Plain-text 1/2 fallback for fixed-price offers ===
  if (isTakeOfferText(text) || isSkipOfferText(text)) {
    const courier = await findCourierByPhone(phone);
    if (!courier) {
      await sendText(phone, "לא מצאנו פרופיל שליח עבור המספר הזה.");
      return;
    }
    const { data: offer } = await supabaseAdmin
      .from("offer_events")
      .select("id, job_id")
      .eq("courier_id", courier.id)
      .eq("response", "pending")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!offer) {
      await sendText(phone, "אין לך כרגע הצעת משלוח פתוחה.");
      return;
    }
    const wantsDecline = isSkipOfferText(text);
    if (wantsDecline) {
      await supabaseAdmin
        .from("offer_events")
        .update({ response: "declined", responded_at: new Date().toISOString() })
        .eq("id", offer.id);
      await supabaseAdmin
        .from("courier_job_declines")
        .upsert({ courier_id: courier.id, job_id: offer.job_id }, { onConflict: "courier_id,job_id" });
      await sendText(phone, "אין בעיה, סימנו שדילגת 👋");
      return;
    }
    const { data: result, error } = await supabaseAdmin.rpc("courier_claim_job_as_bot", {
      _job_id: offer.job_id,
      _courier_id: courier.id,
      _source: "whatsapp-text",
    });
    if (error) {
      await sendText(phone, `⚠️ ${error.message}`);
      return;
    }
    if ((result as { ok?: boolean })?.ok === false) {
      await sendText(phone, "⚠️ המשלוח כבר לא זמין.");
      return;
    }
    await supabaseAdmin
      .from("jobs")
      .update({ delivery_status: "assigned", courier_step: "שליח אישר", accepted_at: new Date().toISOString(), current_status_updated_at: new Date().toISOString() })
      .eq("id", offer.job_id as string);
    await sendAssignedBriefing(phone, offer.job_id as string);
    try {
      const { notifyBusinessJobStatus } = await import("./push/business-status-push.server");
      await notifyBusinessJobStatus(offer.job_id as string, "assigned");
    } catch (err) {
      console.error("[text-claim] notify-business-status failed:", err);
    }
    return;

  }

  // === Courier-only commands ===
  const courier = await findCourierByPhone(phone);
  if (!courier) {
    // Unknown sender → check if it's a registered business first; otherwise
    // auto-provision a private-customer account so they can manage orders
    // from the customer panel or directly through WhatsApp.
    try {
      const { classifySenderPhone, ensureCustomerAccount } = await import(
        "@/lib/customer-provisioning.server"
      );
      const classified = await classifySenderPhone(phone);
      if (classified.kind === "business") {
        // Businesses have their own flows; don't auto-reply here.
        return;
      }
      if (classified.kind === "unknown") {
        const provisioned = await ensureCustomerAccount(phone);
        if (text) {
          const origin =
            process.env.PUBLIC_APP_URL ??
            process.env.APP_ORIGIN ??
            "https://goi-bot.lovable.app";
          const link = `${origin}/customer-login`;
          const welcomeFirst =
            "👋 שלום! אני הבוט של Goi.\n" +
            "פתחתי לך חשבון פרטי אוטומטית — אפשר להזמין משלוח או הובלה כאן בוואטסאפ או מהאזור האישי:\n" +
            link;
          const welcomeReturning =
            "👋 שלום שוב! אפשר להזמין משלוח כאן בוואטסאפ או להיכנס לאזור האישי:\n" +
            link;
          await sendText(phone, provisioned.created ? welcomeFirst : welcomeReturning);
        }
      }
    } catch (e) {
      console.error("[green-webhook] customer auto-provision failed", e);
    }
    return;
  }



  const msgType = body.messageData?.typeMessage;

  // ─── WhatsApp location share → location ping (live tracking) ───
  if (msgType === "locationMessage") {
    const loc = body.messageData?.locationMessageData;
    const lat = Number(loc?.latitude);
    const lng = Number(loc?.longitude);
    if (isFinite(lat) && isFinite(lng)) {
      await supabaseAdmin.from("courier_location_pings").insert({
        courier_id: courier.id,
        lat,
        lng,
        recorded_at: new Date().toISOString(),
      } as never);
      await sendText(phone, "📍 קיבלתי מיקום, עדכנתי במערכת. תודה!");
    }
    return;
  }

  // ─── Image during active delivery → Proof Of Delivery ───
  if (msgType === "imageMessage") {
    const url = body.messageData?.fileMessageData?.downloadUrl;
    const caption = body.messageData?.fileMessageData?.caption ?? "";
    const { data: activeJob } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, customer_id, delivery_status")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeJob?.id) {
      // No active job → forward image to admin silently, no auto-reply.
      try {
        const { data: convId } = await supabaseAdmin.rpc("open_conversation", {
          _kind: "courier_support",
          _courier_id: courier.id,
          _subject: "תמונה מהשליח דרך WhatsApp",
        } as never);
        if (convId) {
          await supabaseAdmin.from("messages").insert({
            conversation_id: convId as never,
            sender_role: "courier",
            body: `[תמונה] ${caption}${caption ? "\n" : ""}${url ?? ""}`.trim(),
          } as never);
        }
      } catch (e) {
        console.error("forward image failed", e);
      }
      return;
    }
    await supabaseAdmin.from("status_logs").insert({
      entity_type: "job",
      entity_id: activeJob.id,
      old_status: activeJob.delivery_status ?? "",
      new_status: "תמונה מהשליח",
      note: `${caption}${caption ? "\n" : ""}${url ?? ""}`,
      changed_by: null,
    } as never);
    if (activeJob.customer_id && url) {
      await supabaseAdmin.from("business_notifications").insert({
        business_id: activeJob.customer_id,
        job_id: activeJob.id,
        kind: "photo",
        title: "📷 השליח שלח תמונה",
        body: `משלוח ${activeJob.job_number} — לחצו לצפייה`,
        link: url,
      } as never);
    }
    return;
  }


  const t = cleanActionText(text).toLowerCase();

  // ─── Help / menu ───
  if (/^(תפריט|עזרה|help|menu|\?)$/i.test(t) || buttonId === "courier_menu") {
    await sendText(
      phone,
      `🤖 פקודות זמינות:\n\n` +
        `*זמינות*\n` +
        `• הפעלה/כיבוי קבלת עבודות — רק מתוך פאנל השליח באפליקציה\n\n` +

        `*מצב*\n` +
        `• "סטטוס" — מצב נוכחי\n` +
        `• "המשלוח שלי" — פרטי משלוח פעיל\n` +
        `• "ניווט" — קישור Google Maps ליעד הבא\n` +
        `• "צור קשר" — מספר טלפון של איש קשר במשלוח\n\n` +
        `*כספים*\n` +
        `• "ארנק" / "יתרה" — יתרה לתשלום\n` +
        `• "היום" — סיכום היום (משלוחים + רווח)\n` +
        `• "השבוע" — סיכום 7 ימים\n` +
        `• "בונוסים" — בונוסים פעילים\n` +
        `• "דירוג" — סטטיסטיקות וביצועים\n\n` +
        `*עבודה*\n` +
        `• "הצעות" — משלוחים פתוחים באזור שלך\n` +
        `• "בטל" — ביטול משלוח פעיל (יישלח לשליח אחר)\n\n` +
        `*תקשורת*\n` +
        `• "תמיכה <הודעה>" — פנייה לאדמין\n` +
        `• 📷 תמונה במשלוח פעיל = אישור מסירה\n` +
        `• 📍 שיתוף מיקום = עדכון מיקום חי\n\n` +
        `שאלה חופשית תועבר לנציג אנושי.`,
    );
    return;
  }

  // ─── Availability toggle (disabled — managed only from courier panel) ───
  const wantsOnline = /^(זמין|פעיל|התחל|online|on|start)$/i.test(t);
  const wantsOffline = /^(לא זמין|לא פעיל|הפסק|offline|off|stop|פאוזה|pause)$/i.test(t);
  if (wantsOnline || wantsOffline) {
    await sendText(
      phone,
      "ℹ️ הפעלת/כיבוי זמינות מתבצעת רק מתוך פאנל השליח באפליקציה — לא מהווצאפ.",
    );
    return;
  }


  // ─── Status ───
  if (/^(סטטוס|status|מצב)$/i.test(t)) {
    const { data: c } = await supabaseAdmin
      .from("couriers")
      .select("courier_status, accepting_jobs, location_sharing_enabled, balance")
      .eq("id", courier.id)
      .maybeSingle();
    const { data: activeJob } = await supabaseAdmin
      .from("jobs")
      .select("job_number, delivery_status, payment")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const avail = c?.accepting_jobs !== false ? "מקבל עבודות ✅" : "קבלת עבודות כבויה ⛔";
    const gps = c?.location_sharing_enabled ? "GPS פעיל 📍" : "GPS כבוי";
    const approvalStatus = c?.courier_status === "ממתין לאישור"
      ? "ממתין לאישור"
      : c?.courier_status === "חסום"
      ? "חסום"
      : "פעיל";
    const job = activeJob
      ? `📦 משלוח פעיל #${activeJob.job_number} — ${HE_STATUS[activeJob.delivery_status ?? ""] ?? activeJob.delivery_status ?? "—"} (₪${activeJob.payment ?? 0})`
      : "אין משלוח פעיל כרגע.";
    await sendText(
      phone,
      `סטטוס: ${avail}\nמיקום: ${gps}\nאישור מנהל: ${approvalStatus}\n💰 יתרה: ₪${c?.balance ?? 0}\n\n${job}`,
    );
    return;
  }

  // ─── Active delivery details ───
  if (/(המשלוח שלי|פרטי משלוח|פרטים)/i.test(t)) {
    const { data: activeJob } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeJob?.id) {
      await sendText(phone, "אין לך משלוח פעיל כרגע.");
      return;
    }
    await sendAssignedBriefing(phone, activeJob.id);
    return;
  }

  // ─── Navigation to next stop ───
  if (/^(ניווט|נווט|nav)$/i.test(t)) {
    const { data: j } = await supabaseAdmin
      .from("jobs")
      .select("delivery_status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!j) {
      await sendText(phone, "אין משלוח פעיל לניווט.");
      return;
    }
    const isDropoffStage = ["picked_up", "heading_to_dropoff", "arrived_at_dropoff"].includes(j.delivery_status ?? "");
    const target = isDropoffStage
      ? { label: "🎯 ניווט למסירה", url: mapsUrl(j.dropoff_address, j.dropoff_lat, j.dropoff_lng), addr: j.dropoff_address }
      : { label: "📍 ניווט לאיסוף", url: mapsUrl(j.pickup_address, j.pickup_lat, j.pickup_lng), addr: j.pickup_address };
    await sendText(phone, `${target.label}\n${target.addr ?? "—"}\n${target.url}`);
    return;
  }

  // ─── Contact info ───
  if (/(צור קשר|טלפון|התקשר|contact)/i.test(t)) {
    const { data: j } = await supabaseAdmin
      .from("jobs")
      .select("delivery_status, pickup_contact_name, pickup_contact_phone, recipient_name, recipient_phone")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!j) {
      await sendText(phone, "אין משלוח פעיל.");
      return;
    }
    const isDropoffStage = ["picked_up", "heading_to_dropoff", "arrived_at_dropoff"].includes(j.delivery_status ?? "");
    const name = isDropoffStage ? j.recipient_name : j.pickup_contact_name;
    const ph = isDropoffStage ? j.recipient_phone : j.pickup_contact_phone;
    if (!ph) {
      await sendText(phone, "אין מספר טלפון לאיש קשר הרלוונטי.");
      return;
    }
    await sendText(phone, `📞 ${name ?? (isDropoffStage ? "מקבל" : "שולח")}\n${ph}\n\nלחץ על המספר כדי לחייג.`);
    return;
  }

  // ─── Wallet / balance ───
  if (/^(ארנק|יתרה|wallet|balance|כסף)$/i.test(t)) {
    const { data: c } = await supabaseAdmin.from("couriers").select("balance").eq("id", courier.id).maybeSingle();
    const { data: pending } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("amount, status")
      .eq("courier_id", courier.id)
      .in("status", ["pending", "approved"] as never);
    const pendingTotal = (pending ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
    await sendText(
      phone,
      `💰 ארנק:\n` +
        `יתרה זמינה: ₪${c?.balance ?? 0}\n` +
        (pendingTotal > 0 ? `🕒 ממתין למשיכה: ₪${pendingTotal}\n` : "") +
        `\nלמשיכת כספים — היכנס לפאנל השליח.`,
    );
    return;
  }

  // ─── Today / week summary ───
  if (/^(היום|today)$/i.test(t) || /^(השבוע|שבוע|week)$/i.test(t)) {
    const isWeek = /^(השבוע|שבוע|week)$/i.test(t);
    const since = new Date(Date.now() - (isWeek ? 7 : 1) * 86400_000).toISOString();
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("payment, status, delivered_at")
      .eq("selected_courier_id", courier.id)
      .gte("delivered_at", since)
      .eq("status", "הושלמה" as never);
    const count = jobs?.length ?? 0;
    const earnings = (jobs ?? []).reduce((s, j) => s + Number(j.payment ?? 0), 0);
    await sendText(
      phone,
      `📊 ${isWeek ? "7 ימים אחרונים" : "סיכום היום"}:\n` +
        `✅ משלוחים שהושלמו: ${count}\n` +
        `💰 רווח: ₪${earnings.toFixed(2)}\n` +
        (count > 0 ? `📈 ממוצע למשלוח: ₪${(earnings / count).toFixed(2)}` : ""),
    );
    return;
  }

  // ─── Bonuses ───
  if (/^(בונוסים|bonus|בונוס)$/i.test(t)) {
    const now = new Date().toISOString();
    const { data: bonuses } = await supabaseAdmin
      .from("courier_bonuses")
      .select("title, description, amount, ends_at")
      .eq("is_active", true)
      .lte("starts_at", now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("sort_order", { ascending: true });
    if (!bonuses?.length) {
      await sendText(phone, "אין בונוסים פעילים כרגע.");
      return;
    }
    const lines = bonuses
      .map((b) => `🎁 ${b.title} — ₪${b.amount}${b.description ? `\n   ${b.description}` : ""}`)
      .join("\n\n");
    await sendText(phone, `🎁 בונוסים פעילים:\n\n${lines}`);
    return;
  }

  // ─── Rating / stats ───
  if (/^(דירוג|rating|סטטיסטיקה|ביצועים)$/i.test(t)) {
    const { data: s } = await supabaseAdmin
      .from("courier_stats")
      .select("avg_rating, acceptance_rate, on_time_rate, jobs_completed, offers_total, avg_response_seconds")
      .eq("courier_id", courier.id)
      .maybeSingle();
    if (!s) {
      await sendText(phone, "עדיין אין נתוני ביצועים.");
      return;
    }
    await sendText(
      phone,
      `📊 הביצועים שלך:\n` +
        `⭐ דירוג ממוצע: ${s.avg_rating ? Number(s.avg_rating).toFixed(2) : "—"}\n` +
        `✅ אחוז קבלת הצעות: ${s.acceptance_rate ?? 0}%\n` +
        `⏱️ בזמן: ${s.on_time_rate ?? 0}%\n` +
        `📦 משלוחים שהושלמו: ${s.jobs_completed ?? 0}\n` +
        `📨 הצעות שהתקבלו: ${s.offers_total ?? 0}\n` +
        (s.avg_response_seconds ? `⚡ זמן תגובה ממוצע: ${s.avg_response_seconds} שנ׳` : ""),
    );
    return;
  }

  // ─── Open offers ───
  if (/^(הצעות|משלוחים פתוחים|open|jobs)$/i.test(t)) {
    const { data: offers } = await supabaseAdmin
      .from("offer_events")
      .select("job_id, jobs(job_number, pickup_address, dropoff_address, payment, package_type)")
      .eq("courier_id", courier.id)
      .eq("response", "pending")
      .order("sent_at", { ascending: false })
      .limit(5);
    if (!offers?.length) {
      await sendText(phone, "אין לך הצעות פתוחות כרגע.");
      return;
    }
    const lines = offers
      .map((o, i) => {
        const j = o.jobs as { job_number?: string; pickup_address?: string; dropoff_address?: string; payment?: number; package_type?: string } | null;
        return `${i + 1}. #${j?.job_number ?? ""} — ₪${j?.payment ?? 0}\n   📍 ${j?.pickup_address ?? "—"} → ${j?.dropoff_address ?? "—"}`;
      })
      .join("\n\n");
    await sendText(phone, `📋 הצעות פתוחות:\n\n${lines}\n\nלקבלת משלוח לחץ "קח את המשלוח" בהצעה הרלוונטית.`);
    return;
  }

  // ─── Cancel active delivery ───
  if (/^(בטל|ביטול|cancel)$/i.test(t)) {
    const { data: activeJob } = await supabaseAdmin
      .from("jobs")
      .select("id, job_number, customer_id, delivery_status")
      .eq("selected_courier_id", courier.id)
      .in("status", ["נבחר שליח", "פעילה"] as never)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!activeJob?.id) {
      await sendText(phone, "אין משלוח פעיל לביטול.");
      return;
    }
    if (activeJob.delivery_status === "delivered") {
      await sendText(phone, "המשלוח כבר נמסר — לא ניתן לבטל.");
      return;
    }
    await supabaseAdmin
      .from("jobs")
      .update({
        selected_courier_id: null,
        status: "נשלחה לשליחים" as never,
        delivery_status: "open",
        courier_step: null,
        current_status_updated_at: new Date().toISOString(),
      } as never)
      .eq("id", activeJob.id);
    await supabaseAdmin
      .from("courier_job_declines")
      .upsert({ courier_id: courier.id, job_id: activeJob.id }, { onConflict: "courier_id,job_id" });
    await supabaseAdmin.from("status_logs").insert({
      entity_type: "job",
      entity_id: activeJob.id,
      old_status: activeJob.delivery_status ?? "",
      new_status: "בוטל ע״י שליח",
      note: "השליח ביטל דרך WhatsApp",
      changed_by: null,
    } as never);
    if (activeJob.customer_id) {
      await supabaseAdmin.from("business_notifications").insert({
        business_id: activeJob.customer_id,
        job_id: activeJob.id,
        kind: "courier_cancelled",
        title: "⚠️ השליח ביטל את המשלוח",
        body: `משלוח ${activeJob.job_number} — מחפש שליח חלופי`,
        link: `/business/order/${activeJob.id}`,
      } as never);
    }
    await sendText(phone, `❌ ביטלת את משלוח #${activeJob.job_number}. נחפש שליח חלופי.`);
    return;
  }

  // ─── Support ticket ───
  if (/^(תמיכה|support|עזרה דחופה)/i.test(t)) {
    const body = text.replace(/^\s*(תמיכה|support|עזרה דחופה)\s*[:\-]?\s*/i, "").trim();
    if (!body) {
      await sendText(phone, "שלח: \"תמיכה <ההודעה שלך>\" כדי לפתוח פנייה לאדמין.");
      return;
    }
    const { data: convId } = await supabaseAdmin.rpc("open_conversation", {
      _kind: "courier_support",
      _courier_id: courier.id,
      _subject: "תמיכה דרך WhatsApp",
    } as never);
    if (convId) {
      await supabaseAdmin.from("messages").insert({
        conversation_id: convId as never,
        sender_role: "courier",
        body,
      } as never);
      await sendText(phone, "📨 נשלח לאדמין. נחזור אליך כאן בהקדם.");
    } else {
      await sendText(phone, "⚠️ לא הצלחתי לפתוח פנייה כרגע. נסה שוב.");
    }
    return;
  }

  // ─── Unknown message → forward to admin silently, no auto-reply ───
  // Per user request: the bot must NOT auto-reply to free-text messages.
  // Forward the message into a courier_support conversation so the admin
  // can answer manually from the admin chat UI. Do not send any text back.
  if (text) {
    try {
      const { data: convId } = await supabaseAdmin.rpc("open_conversation", {
        _kind: "courier_support",
        _courier_id: courier.id,
        _subject: "שאלה מהשליח דרך WhatsApp",
      } as never);
      if (convId) {
        await supabaseAdmin.from("messages").insert({
          conversation_id: convId as never,
          sender_role: "courier",
          body: text,
        } as never);
      }
    } catch (e) {
      console.error("forward unknown message failed", e);
    }
  }
}
