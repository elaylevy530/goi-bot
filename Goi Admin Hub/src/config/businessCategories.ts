// Business categories for GOI Business panel.
// Drives dynamic delivery-form templates and service-type routing.

export type ServiceType = "couriers" | "moving" | "mixed";
export type Timing = "now" | "within_hour" | "today" | "scheduled";

export type DeliveryType = { key: string; label: string; emoji?: string };
export type Attribute = { key: string; label: string; optional?: boolean };

export type BusinessCategory = {
  key: string;
  label: string;
  emoji: string;
  serviceType: ServiceType;
  description?: string;
  deliveryTypes: DeliveryType[];
  timings: Timing[];
  attributes: Attribute[];
};

// Common delivery types every category also inherits (like the "general" fallback).
export const GENERAL_DELIVERY_TYPES: DeliveryType[] = [
  { key: "product", label: "מוצר", emoji: "📦" },
  { key: "parcel", label: "חבילה", emoji: "🎁" },
  { key: "bag", label: "שקית", emoji: "🛍" },
  { key: "documents", label: "מסמכים", emoji: "📄" },
  { key: "other", label: "אחר", emoji: "✳️" },
];

export const TIMING_LABELS: Record<Timing, { label: string; sub: string; emoji: string }> = {
  now: { label: "עכשיו", sub: "ASAP · ~45 דק׳", emoji: "⚡" },
  within_hour: { label: "תוך שעה", sub: "בשעה הקרובה", emoji: "🕐" },
  today: { label: "היום", sub: "חלון שעות היום", emoji: "📅" },
  scheduled: { label: "מתוזמן", sub: "תאריך + שעה", emoji: "📆" },
};

const ALL_TIMINGS: Timing[] = ["now", "within_hour", "today", "scheduled"];

// -------------------- Categories --------------------

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // ---------- Couriers ----------
  {
    key: "flowers", label: "חנות פרחים", emoji: "🌸", serviceType: "couriers",
    deliveryTypes: [
      { key: "bouquet", label: "זר פרחים", emoji: "💐" },
      { key: "pot", label: "עציץ", emoji: "🪴" },
      { key: "flowers_box", label: "מארז פרחים", emoji: "🎁" },
      { key: "big_arrangement", label: "סידור גדול", emoji: "🌺" },
      { key: "gift_with_flowers", label: "מתנה עם פרחים", emoji: "💝" },
    ],
    timings: ["now", "within_hour", "today", "scheduled"],
    attributes: [
      { key: "fragile", label: "שביר" },
      { key: "upright", label: "דורש עמידה" },
      { key: "cold_sensitive", label: "רגיש לחום", optional: true },
      { key: "greeting_card", label: "כולל כרטיס ברכה", optional: true },
      { key: "surprise", label: "הפתעה — לא לחשוף שולח", optional: true },
      { key: "signature", label: "חתימת נמען", optional: true },
      { key: "any_vehicle", label: "רכב רגיל מספיק", optional: true },
    ],
  },
  {
    key: "gifts", label: "חנות מתנות", emoji: "🎁", serviceType: "couriers",
    deliveryTypes: [
      { key: "box", label: "מארז", emoji: "🎁" },
      { key: "gift", label: "מתנה", emoji: "🎀" },
      { key: "balloons", label: "בלונים", emoji: "🎈" },
      { key: "shopping_bag", label: "שקית קנייה", emoji: "🛍" },
      { key: "big_product", label: "מוצר גדול", emoji: "📦" },
    ],
    timings: ALL_TIMINGS,
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }, { key: "surprise", label: "הפתעה — לא לחשוף שולח", optional: true }, { key: "signature", label: "חתימת נמען", optional: true }],
  },
  {
    key: "pets", label: "חנות חיות", emoji: "🐶", serviceType: "couriers",
    deliveryTypes: [
      { key: "food_bag", label: "שק מזון", emoji: "🥫" },
      { key: "pet_equipment", label: "ציוד לחיות", emoji: "🦴" },
      { key: "cage", label: "כלוב", emoji: "🐦" },
      { key: "bed", label: "מיטה", emoji: "🛏" },
      { key: "products_bag", label: "שקית מוצרים", emoji: "🛍" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד", optional: true }, { key: "live_animal", label: "חיה חיה — זהירות" }, { key: "cold_chain", label: "מזון מקורר", optional: true }, { key: "any_vehicle", label: "רכב רגיל מספיק", optional: true }],
  },
  {
    key: "clothes", label: "חנות בגדים", emoji: "👕", serviceType: "couriers",
    deliveryTypes: [
      { key: "clothes_bag", label: "שקית בגדים", emoji: "🛍" },
      { key: "few_items", label: "מספר פריטים", emoji: "👗" },
      { key: "box", label: "קופסה", emoji: "📦" },
      { key: "big_order", label: "הזמנה גדולה", emoji: "🛒" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "hangers", label: "על קולבים", optional: true }, { key: "fragile", label: "שביר", optional: true }, { key: "fitting", label: "התאמת מידה — להמתין", optional: true }, { key: "returns", label: "כולל החזרה", optional: true }],
  },
  {
    key: "jewelry", label: "חנות תכשיטים", emoji: "💍", serviceType: "couriers",
    deliveryTypes: [
      { key: "jewel", label: "תכשיט", emoji: "💎" },
      { key: "box", label: "מארז", emoji: "🎁" },
      { key: "case", label: "קופסה", emoji: "📦" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "valuable", label: "פריט יקר" }, { key: "signature", label: "חתימה בקבלה" }, { key: "id_check", label: "בדיקת ת.ז" }, { key: "insurance", label: "מבוטח", optional: true }, { key: "discreet", label: "אריזה דיסקרטית", optional: true }],
  },
  {
    key: "mobile", label: "חנות סלולר", emoji: "📱", serviceType: "couriers",
    deliveryTypes: [
      { key: "phone", label: "טלפון", emoji: "📱" },
      { key: "accessories", label: "אביזרים", emoji: "🎧" },
      { key: "tablet", label: "טאבלט", emoji: "📱" },
      { key: "product", label: "מוצר", emoji: "📦" },
    ],
    timings: ["now", "within_hour", "today"],
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "valuable", label: "פריט יקר", optional: true }, { key: "signature", label: "חתימת נמען" }, { key: "id_check", label: "בדיקת ת.ז", optional: true }],
  },
  {
    key: "cosmetics", label: "קוסמטיקה / פארם", emoji: "💄", serviceType: "couriers",
    deliveryTypes: [
      { key: "beauty", label: "מוצרי טיפוח", emoji: "🧴" },
      { key: "perfume", label: "בישום", emoji: "🌹" },
      { key: "kit", label: "מארז", emoji: "🎁" },
      { key: "bag", label: "שקית", emoji: "🛍" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "temperature_sensitive", label: "רגיש לטמפרטורה", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }],
  },
  {
    key: "print", label: "בית דפוס", emoji: "🖨", serviceType: "couriers",
    deliveryTypes: [
      { key: "docs", label: "מסמכים", emoji: "📄" },
      { key: "printed", label: "חומר מודפס", emoji: "📃" },
      { key: "sign", label: "שלט", emoji: "🪧" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
      { key: "big_product", label: "מוצר גדול", emoji: "📦" },
    ],
    timings: ["within_hour", "today", "scheduled"],
    attributes: [{ key: "do_not_fold", label: "לא לקפל" }, { key: "flat", label: "להוביל שטוח", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "heavy", label: "כבד", optional: true }],
  },
  {
    key: "local_store", label: "חנות מקומית", emoji: "🏪", serviceType: "couriers",
    deliveryTypes: [
      { key: "product", label: "מוצר", emoji: "📦" },
      { key: "bag", label: "שקית", emoji: "🛍" },
      { key: "box", label: "קופסה", emoji: "📦" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "heavy", label: "כבד", optional: true }, { key: "refrigerated", label: "מקורר", optional: true }],
  },
  {
    key: "social_shop", label: "עסק אינסטגרם / וואטסאפ", emoji: "📦", serviceType: "couriers",
    deliveryTypes: [
      { key: "kit", label: "מארז", emoji: "🎁" },
      { key: "product", label: "מוצר", emoji: "📦" },
      { key: "bag", label: "שקית", emoji: "🛍" },
      { key: "box", label: "קופסה", emoji: "📦" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "surprise", label: "הפתעה — לא לחשוף שולח", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }, { key: "cod", label: "תשלום במזומן ממקבל", optional: true }],
  },
  {
    key: "pharmacy", label: "בית מרקחת", emoji: "💊", serviceType: "couriers",
    deliveryTypes: [
      { key: "medicine", label: "תרופות", emoji: "💊" },
      { key: "medical", label: "ציוד רפואי", emoji: "🩺" },
      { key: "bag", label: "שקית", emoji: "🛍" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
    ],
    timings: ["now", "within_hour", "today"],
    attributes: [{ key: "sensitive", label: "רגיש" }, { key: "refrigerated", label: "מקורר", optional: true }, { key: "prescription", label: "מרשם — להציג ת.ז" }, { key: "urgent", label: "דחוף", optional: true }, { key: "signature", label: "חתימת נמען", optional: true }],
  },
  {
    key: "clinic", label: "קליניקה", emoji: "🩺", serviceType: "couriers",
    deliveryTypes: [
      { key: "docs", label: "מסמכים", emoji: "📄" },
      { key: "medical", label: "ציוד רפואי", emoji: "🩺" },
      { key: "product", label: "מוצר ללקוח", emoji: "📦" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "sensitive", label: "רגיש" }, { key: "confidential", label: "סודי" }, { key: "signature", label: "חתימת נמען", optional: true }, { key: "id_check", label: "בדיקת ת.ז", optional: true }],
  },
  {
    key: "law", label: "משרד עורכי דין", emoji: "⚖", serviceType: "couriers",
    deliveryTypes: [
      { key: "docs", label: "מסמכים", emoji: "📄" },
      { key: "file", label: "תיק", emoji: "🗂" },
      { key: "contract", label: "חוזה", emoji: "📝" },
      { key: "keys", label: "מפתחות", emoji: "🔑" },
    ],
    timings: ["within_hour", "today", "scheduled"],
    attributes: [{ key: "confidential", label: "סודי" }, { key: "signature", label: "חתימת נמען" }, { key: "id_check", label: "בדיקת ת.ז", optional: true }, { key: "urgent", label: "דחוף", optional: true }, { key: "sealed", label: "מעטפה חתומה", optional: true }],
  },
  {
    key: "accountant", label: "משרד רואה חשבון", emoji: "🧾", serviceType: "couriers",
    deliveryTypes: [
      { key: "docs", label: "מסמכים", emoji: "📄" },
      { key: "file", label: "תיק", emoji: "🗂" },
      { key: "envelope", label: "מעטפה", emoji: "✉️" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "confidential", label: "סודי" }, { key: "signature", label: "חתימת נמען", optional: true }, { key: "sealed", label: "מעטפה חתומה", optional: true }],
  },
  {
    key: "office", label: "משרד / חברה", emoji: "🏢", serviceType: "couriers",
    deliveryTypes: [
      { key: "docs", label: "מסמכים", emoji: "📄" },
      { key: "computer", label: "מחשב", emoji: "💻" },
      { key: "equipment", label: "ציוד", emoji: "🧰" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
      { key: "keys", label: "מפתחות", emoji: "🔑" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד", optional: true }, { key: "fragile", label: "שביר", optional: true }, { key: "confidential", label: "סודי", optional: true }, { key: "signature", label: "חתימת נמען", optional: true }, { key: "reception", label: "מסירה בקבלה", optional: true }],
  },
  {
    key: "balloons_events", label: "בלונים ואירועים", emoji: "🎈", serviceType: "couriers",
    deliveryTypes: [
      { key: "balloons", label: "בלונים", emoji: "🎈" },
      { key: "arrangement", label: "סידור בלונים", emoji: "🎊" },
      { key: "gift", label: "מתנה", emoji: "🎁" },
      { key: "event_kit", label: "ציוד לאירוע", emoji: "🎉" },
    ],
    timings: ALL_TIMINGS,
    attributes: [{ key: "upright", label: "דורש עמידה" }, { key: "fragile", label: "שביר" }, { key: "helium", label: "מנופח בהליום" }, { key: "no_wind", label: "רגיש לרוח", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "any_vehicle", label: "רכב רגיל מספיק", optional: true }],
  },
  {
    key: "bakery", label: "קונדיטוריה", emoji: "🎂", serviceType: "couriers",
    deliveryTypes: [
      { key: "cake", label: "עוגה", emoji: "🎂" },
      { key: "pastries", label: "מאפים", emoji: "🥐" },
      { key: "box", label: "קופסה", emoji: "📦" },
      { key: "kit", label: "מארז", emoji: "🎁" },
    ],
    timings: ["now", "within_hour", "today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר" }, { key: "upright", label: "דורש עמידה" }, { key: "refrigerated", label: "מקורר", optional: true }, { key: "temperature_sensitive", label: "רגיש לחום", optional: true }, { key: "no_shake", label: "בלי טלטולים" }],
  },
  {
    key: "books", label: "חנות ספרים", emoji: "📚", serviceType: "couriers",
    deliveryTypes: [
      { key: "book", label: "ספר", emoji: "📖" },
      { key: "box", label: "קופסה", emoji: "📦" },
      { key: "bag", label: "שקית", emoji: "🛍" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד", optional: true }, { key: "no_bend", label: "לא לקפל", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }],
  },
  {
    key: "baby", label: "חנות תינוקות", emoji: "👶", serviceType: "couriers",
    deliveryTypes: [
      { key: "product", label: "מוצר לתינוק", emoji: "🍼" },
      { key: "diapers", label: "חיתולים", emoji: "🧷" },
      { key: "toys", label: "צעצועים", emoji: "🧸" },
      { key: "bag", label: "שקית", emoji: "🛍" },
      { key: "big_product", label: "מוצר גדול", emoji: "📦" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד", optional: true }, { key: "fragile", label: "שביר", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }],
  },
  {
    key: "general", label: "עסק מקומי כללי", emoji: "🛒", serviceType: "couriers",
    description: "ברירת מחדל — כל סוגי המשלוחים הבסיסיים",
    deliveryTypes: [
      { key: "product", label: "מוצר", emoji: "📦" },
      { key: "parcel", label: "חבילה", emoji: "🎁" },
      { key: "bag", label: "שקית", emoji: "🛍" },
      { key: "docs", label: "מסמכים", emoji: "📄" },
    ],
    timings: ["now", "today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר", optional: true }, { key: "heavy", label: "כבד", optional: true }, { key: "urgent", label: "דחוף", optional: true }, { key: "signature", label: "חתימת נמען", optional: true }],
  },

  // ---------- Mixed ----------
  {
    key: "computers", label: "חנות מחשבים", emoji: "💻", serviceType: "mixed",
    deliveryTypes: [
      { key: "computer", label: "מחשב", emoji: "💻" },
      { key: "screen", label: "מסך", emoji: "🖥" },
      { key: "gear", label: "ציוד מחשוב", emoji: "⌨️" },
      { key: "accessories", label: "אביזרים", emoji: "🖱" },
    ],
    timings: ["now", "today"],
    attributes: [{ key: "fragile", label: "שביר" }, { key: "valuable", label: "פריט יקר", optional: true }, { key: "signature", label: "חתימת נמען" }, { key: "no_shake", label: "בלי טלטולים", optional: true }],
  },
  {
    key: "electronics", label: "חנות אלקטרוניקה", emoji: "📺", serviceType: "mixed",
    deliveryTypes: [
      { key: "product", label: "מוצר", emoji: "📦" },
      { key: "tv", label: "טלוויזיה", emoji: "📺" },
      { key: "accessories", label: "אביזרים", emoji: "🎧" },
      { key: "box", label: "קופסה", emoji: "📦" },
    ],
    timings: ["now", "today"],
    attributes: [{ key: "fragile", label: "שביר" }, { key: "heavy", label: "כבד", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "signature", label: "חתימת נמען", optional: true }, { key: "upright", label: "דורש עמידה", optional: true }],
  },
  {
    key: "technicians", label: "טכנאים", emoji: "🔧", serviceType: "mixed",
    deliveryTypes: [
      { key: "spare", label: "חלק חילוף", emoji: "⚙️" },
      { key: "gear", label: "ציוד", emoji: "🧰" },
      { key: "tools", label: "כלי עבודה", emoji: "🛠" },
      { key: "parcel", label: "חבילה", emoji: "📦" },
    ],
    timings: ["now", "within_hour", "today"],
    attributes: [{ key: "heavy", label: "כבד", optional: true }, { key: "sharp", label: "חד / מסוכן", optional: true }, { key: "urgent", label: "דחוף", optional: true }, { key: "oily", label: "שמנוני", optional: true }],
  },
  {
    key: "home_design", label: "עיצוב ומתנות לבית", emoji: "🖼", serviceType: "mixed",
    deliveryTypes: [
      { key: "decor", label: "פריט עיצוב", emoji: "🖼" },
      { key: "gift", label: "מתנה", emoji: "🎁" },
      { key: "box", label: "קופסה", emoji: "📦" },
      { key: "big_product", label: "מוצר גדול", emoji: "🛋" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "fragile", label: "שביר" }, { key: "upright", label: "דורש עמידה", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "gift_wrapped", label: "עטוף כמתנה", optional: true }],
  },

  // ---------- Moving ----------
  {
    key: "garage", label: "מוסך", emoji: "🚗", serviceType: "moving",
    deliveryTypes: [
      { key: "spare", label: "חלקי חילוף", emoji: "⚙️" },
      { key: "tire", label: "צמיג", emoji: "🛞" },
      { key: "gear", label: "ציוד", emoji: "🧰" },
      { key: "box", label: "קופסה", emoji: "📦" },
    ],
    timings: ["now", "within_hour", "today"],
    attributes: [{ key: "heavy", label: "כבד" }, { key: "oily", label: "שמנוני / מלוכלך", optional: true }, { key: "sharp", label: "חד / מסוכן", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }],
  },
  {
    key: "nursery", label: "משתלה", emoji: "🪴", serviceType: "moving",
    deliveryTypes: [
      { key: "big_plant", label: "צמח גדול", emoji: "🌳" },
      { key: "plants_pack", label: "מארז צמחים", emoji: "🪴" },
      { key: "sacks", label: "שקי אדמה / דשן", emoji: "🥔" },
      { key: "equipment", label: "ציוד גינון", emoji: "🌿" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד" }, { key: "upright", label: "דורש עמידה" }, { key: "wet", label: "רטוב", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }, { key: "dirty", label: "מלוכלך", optional: true }],
  },
  {
    key: "furniture", label: "חנות רהיטים", emoji: "🪑", serviceType: "moving",
    deliveryTypes: [
      { key: "chair", label: "כיסא", emoji: "🪑" },
      { key: "table", label: "שולחן", emoji: "🪟" },
      { key: "sofa", label: "ספה", emoji: "🛋" },
      { key: "cabinet", label: "ארון", emoji: "🚪" },
      { key: "big_product", label: "מוצר גדול", emoji: "📦" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד" }, { key: "assembly", label: "דורש הרכבה", optional: true }, { key: "big_size", label: "גודל גדול" }, { key: "two_persons", label: "דורש שני אנשים", optional: true }, { key: "fragile", label: "שביר", optional: true }],
  },
  {
    key: "hardware", label: "חומרי בניין קלים", emoji: "🛠", serviceType: "moving",
    deliveryTypes: [
      { key: "tools", label: "כלי עבודה", emoji: "🛠" },
      { key: "materials", label: "חומרי בניין", emoji: "🧱" },
      { key: "sacks", label: "שקים", emoji: "📦" },
      { key: "gear", label: "ציוד", emoji: "🧰" },
    ],
    timings: ["today", "scheduled"],
    attributes: [{ key: "heavy", label: "כבד" }, { key: "sharp", label: "חד / מסוכן", optional: true }, { key: "dusty", label: "מאובק / מלוכלך", optional: true }, { key: "big_size", label: "גודל גדול", optional: true }],
  },
];

// -------------------- Helpers --------------------

export function getCategory(key?: string | null): BusinessCategory {
  if (!key) return BUSINESS_CATEGORIES.find((c) => c.key === "general")!;
  return (
    BUSINESS_CATEGORIES.find((c) => c.key === key) ??
    BUSINESS_CATEGORIES.find((c) => c.key === "general")!
  );
}

export function getDeliveryTypesForCategory(key?: string | null): DeliveryType[] {
  const cat = getCategory(key);
  // Merge specific + generals, de-dup by label.
  const merged = [...cat.deliveryTypes, ...GENERAL_DELIVERY_TYPES];
  const seen = new Set<string>();
  return merged.filter((t) => {
    if (seen.has(t.label)) return false;
    seen.add(t.label);
    return true;
  });
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, { label: string; emoji: string; color: string }> = {
  couriers: { label: "שליחים", emoji: "🛵", color: "bg-[#F5C518]/15 text-[#8A6100]" },
  moving:   { label: "הובלה",  emoji: "🚚", color: "bg-[#E4F0FF] text-[#0B5FCC]" },
  mixed:    { label: "מעורב",  emoji: "🔀", color: "bg-[#F1E7FF] text-[#5B21B6]" },
};
