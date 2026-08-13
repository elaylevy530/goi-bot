/**
 * Shared (client-safe) builder for the WhatsApp group message of a job.
 * Used by the server dispatcher AND by the partner panel live preview,
 * so what an admin sees in /partners is exactly what gets sent.
 */

export type JobMessageInput = {
  id?: string;
  job_number?: string | number | null;
  short_code?: string | null;
  service_category?: string | null;
  package_type?: string | null;
  package_size?: string | null;
  number_of_packages?: number | null;
  fragile?: boolean | null;
  description?: string | null;
  pickup_address?: string | null;
  pickup_area?: string | null;
  pickup_floor?: string | number | null;
  pickup_notes?: string | null;
  dropoff_address?: string | null;
  dropoff_area?: string | null;
  dropoff_floor?: string | number | null;
  dropoff_notes?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  estimated_distance_km?: number | null;
  vehicle_required?: string | null;
  job_date?: string | null;
  job_time?: string | null;
  delivery_deadline?: string | null;
  suggested_courier_payment?: number | null;
  payment?: number | null;
  /** "fixed_price" | "quote_request" — quote jobs never publish a price. */
  pricing_type?: string | null;
};

export type SectionKey =
  | "title"
  | "job_ref"
  | "kind"
  | "when"
  | "distance"
  | "price"
  | "pickup"
  | "dropoff"
  | "floors"
  | "vehicle"
  | "contact"
  | "details"
  | "notes"
  | "cta"
  | "link"
  | "partner_note";

export const SECTION_DEFS: { key: SectionKey; label: string; hint: string }[] = [
  { key: "title", label: "כותרת + ערים", hint: "הובלה חדשה 🚚 מתל אביב לחיפה" },
  { key: "job_ref", label: "מספר הזמנה", hint: "#1042" },
  { key: "kind", label: "סוג ותכולה", hint: "🧾 דירת 3 חדרים × 2 · גדול" },
  { key: "when", label: "מועד", hint: "⏰ היום 14:00" },
  { key: "distance", label: "מרחק", hint: '📏 12.4 ק"מ' },
  { key: "price", label: "מחיר", hint: "💰 ₪280" },
  { key: "pickup", label: "כתובת איסוף", hint: "📍 מ: ..." },
  { key: "dropoff", label: "כתובת יעד", hint: "🎯 ל: ..." },
  { key: "floors", label: "קומות / מעלית", hint: "🏢 קומה 3 → קומה 1" },
  { key: "vehicle", label: "סוג רכב נדרש", hint: "🚚 רכב" },
  { key: "contact", label: "פרטי קשר של הלקוח", hint: "👤 דנה · 054-..." },
  { key: "details", label: "תיאור / פירוט", hint: "📝 ..." },
  { key: "notes", label: "הערות איסוף ויעד", hint: "🗒️ ..." },
  { key: "cta", label: "שורת קריאה לפעולה", hint: "רוצה לקחת את העבודה?" },
  { key: "link", label: "לינק להצעה", hint: "👉 goi-bot.lovable.app/g/ab3k9d" },
  { key: "partner_note", label: "הערת שותף", hint: "טקסט חופשי בסוף ההודעה" },
];

export const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  title: true,
  job_ref: true,
  kind: true,
  when: true,
  distance: true,
  price: true,
  pickup: true,
  dropoff: true,
  floors: true,
  vehicle: false,
  contact: false,
  details: true,
  notes: false,
  cta: true,
  link: true,
  partner_note: true,
};

export function normalizeSections(raw: unknown): Record<SectionKey, boolean> {
  const out = { ...DEFAULT_SECTIONS };
  if (raw && typeof raw === "object") {
    for (const def of SECTION_DEFS) {
      const v = (raw as Record<string, unknown>)[def.key];
      if (typeof v === "boolean") out[def.key] = v;
    }
  }
  return out;
}

const COUNTRY_WORDS = ["ישראל", "israel", "il"];

export function cityOf(area?: string | null, address?: string | null): string {
  const clean = (v: string) => v.replace(/\d{5,}/g, "").trim();
  if (area && !COUNTRY_WORDS.includes(area.trim().toLowerCase())) return clean(area);
  if (!address) return "";
  const parts = String(address)
    .split(",")
    .map((p) => clean(p))
    .filter(Boolean)
    .filter((p) => !COUNTRY_WORDS.includes(p.toLowerCase()));
  if (!parts.length) return "";
  // Last remaining part is usually the city; if it still looks like a street
  // (contains digits) fall back to the previous one.
  const last = parts[parts.length - 1]!;
  if (/\d/.test(last) && parts.length > 1) return parts[parts.length - 2]!;
  return last;
}

export type BuildOptions = {
  sections?: Partial<Record<SectionKey, boolean>> | null;
  link?: string;
  cta?: string | null;
  partnerNote?: string | null;
};

export function buildJobMessage(job: JobMessageInput, opts: BuildOptions = {}): string {
  const s = normalizeSections(opts.sections);
  const isMove =
    job.service_category === "small_move" || job.service_category === "big_move";

  const pickupLine =
    [job.pickup_address, job.pickup_area].filter(Boolean).join(", ").trim() || "—";
  const dropoffLine =
    [job.dropoff_address, job.dropoff_area].filter(Boolean).join(", ").trim() || "—";
  // When the customer asked for quotes, the internal price must NOT be shown —
  // movers are supposed to send their own offer.
  const isQuoteRequest = job.pricing_type === "quote_request";
  const price = isQuoteRequest
    ? null
    : (job.suggested_courier_payment ?? job.payment ?? null);

  const qty = Number(job.number_of_packages ?? 0);
  const kindLabel = job.package_type || (isMove ? "הובלה" : "משלוח");
  const kindLine = `${kindLabel}${qty > 1 ? ` × ${qty}` : ""}${
    job.package_size ? ` · ${job.package_size}` : ""
  }${job.fragile ? " · שביר" : ""}`;

  // Time window: prefer an explicit range written into the description by the
  // order panel ("14:00–16:00"), otherwise derive a 2h window from job_time.
  const descRaw = (job.description || "").trim();
  const rangeMatch = descRaw.match(/(\d{1,2}:\d{2})\s*[–\-—]\s*(\d{1,2}:\d{2})/);
  const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");
  const timeText = rangeMatch
    ? `${rangeMatch[1]}–${rangeMatch[2]}`
    : hhmm(job.job_time);

  let whenText = "עכשיו";
  if (job.job_date || timeText) {
    const today = new Date().toISOString().slice(0, 10);
    const dateStr = job.job_date
      ? job.job_date === today
        ? "היום"
        : new Date(job.job_date).toLocaleDateString("he-IL")
      : "";
    whenText = [dateStr, timeText].filter(Boolean).join(" · ") || "עכשיו";
    if (rangeMatch) whenText += " (טווח)";
  }
  const deadlineTime = job.delivery_deadline
    ? new Date(job.delivery_deadline).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const distance = job.estimated_distance_km
    ? `${Number(job.estimated_distance_km).toFixed(1)} ק"מ`
    : "";

  const fromCity = cityOf(job.pickup_area, job.pickup_address);
  const toCity = cityOf(job.dropoff_area, job.dropoff_address);
  const baseTitle = isMove ? "הובלה חדשה 🚚" : "משלוח חדש 📦";
  const title = fromCity
    ? `${baseTitle} מ${fromCity}${toCity ? ` ל${toCity}` : ""}`
    : baseTitle;
  const jobRef = s.job_ref && job.job_number ? ` #${job.job_number}` : "";

  const floorsBits: string[] = [];
  if (job.pickup_floor !== null && job.pickup_floor !== undefined && `${job.pickup_floor}` !== "")
    floorsBits.push(`איסוף: קומה ${job.pickup_floor}`);
  if (job.dropoff_floor !== null && job.dropoff_floor !== undefined && `${job.dropoff_floor}` !== "")
    floorsBits.push(`יעד: קומה ${job.dropoff_floor}`);

  const notesBits = [job.pickup_notes, job.dropoff_notes].filter(Boolean).join(" · ");
  const contactBits = [job.recipient_name, job.recipient_phone].filter(Boolean).join(" · ");
  // The date + time window already appear in the "when" line — strip them from
  // the free-text description so the message doesn't repeat itself.
  const details = descRaw
    .replace(/^(מוביל|שליח):[^·]*·\s*/, "")
    .split("·")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p &&
        !/^\d{1,2}:\d{2}\s*[–\-—]\s*\d{1,2}:\d{2}$/.test(p) &&
        !/^\d{1,2}:\d{2}$/.test(p) &&
        !/^(היום|מחר|מחרתיים)$/.test(p) &&
        !/^\d{1,2}[./]\d{1,2}([./]\d{2,4})?$/.test(p),
    )
    .join(" · ")
    .trim();

  const ctaText =
    (opts.cta || "").trim() ||
    (price ? "רוצה לקחת את העבודה או להציע מחיר אחר?" : "רוצה להגיש הצעת מחיר?");
  const ctaLine = isQuoteRequest && !(opts.cta || "").trim()
    ? "רוצה להגיש הצעת מחיר? הלקוח בוחר מבין ההצעות"
    : ctaText;

  const head = s.title ? `*${title}*${jobRef}` : jobRef ? `*${jobRef.trim()}*` : "";

  const body = [
    s.kind ? `🧾 ${kindLine}` : "",
    s.when ? `⏰ ${whenText}${deadlineTime ? ` · עד ${deadlineTime}` : ""}` : "",
    s.distance && distance ? `📏 ${distance}` : "",
    s.vehicle && job.vehicle_required ? `🚚 ${job.vehicle_required}` : "",
    s.price ? (price ? `💰 ₪${price}` : isQuoteRequest ? "💰 מחיר: פתוח להצעות" : "") : "",
  ].filter(Boolean);

  const addr = [
    s.pickup ? `📍 מ: ${pickupLine}` : "",
    s.dropoff ? `🎯 ל: ${dropoffLine}` : "",
    s.floors && floorsBits.length ? `🏢 ${floorsBits.join(" · ")}` : "",
    s.contact && contactBits ? `👤 ${contactBits}` : "",
    s.details && details ? `📝 ${details}` : "",
    s.notes && notesBits ? `🗒️ ${notesBits}` : "",
  ].filter(Boolean);

  const tail: string[] = [];
  if (s.cta) tail.push(ctaLine);
  if (s.link && opts.link) {
    tail.push(`👉 ${opts.link}`);
    tail.push("(נכנסים ללינק, ממלאים שם + טלפון ומאשרים — נחזור אליך)");
  }

  const partnerNote =
    s.partner_note && opts.partnerNote?.trim() ? opts.partnerNote.trim() : "";

  return [
    head,
    body.length ? "" : "",
    ...body,
    addr.length ? "" : "",
    ...addr,
    tail.length ? "" : "",
    ...tail,
    partnerNote ? "" : "",
    partnerNote,
  ]
    .filter((l, i, arr) => !(l === "" && (i === 0 || arr[i - 1] === "")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
