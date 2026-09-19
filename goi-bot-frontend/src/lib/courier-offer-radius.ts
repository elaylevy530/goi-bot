export const DEFAULT_OFFER_RADIUS_KM = 15;
export const MIN_OFFER_RADIUS_KM = 1;
export const MAX_OFFER_RADIUS_KM = 200;

/** Admin-managed GPS offer radius. Legacy courier labels still parse. */
export function parseOfferRadiusKm(label?: string | null): number {
  if (!label) return DEFAULT_OFFER_RADIUS_KM;
  if (label.includes("כל הארץ")) return MAX_OFFER_RADIUS_KM;
  if (label.includes("המרכז")) return 30;
  if (label.includes("בתוך העיר")) return 5;
  const m = String(label).match(/(\d+)/);
  if (!m) return DEFAULT_OFFER_RADIUS_KM;
  return Math.max(MIN_OFFER_RADIUS_KM, Math.min(MAX_OFFER_RADIUS_KM, parseInt(m[1], 10)));
}

export function formatOfferRadiusKm(label?: string | null): string {
  if (!String(label ?? "").trim()) return `${DEFAULT_OFFER_RADIUS_KM} ק״מ (ברירת מחדל)`;
  return `${parseOfferRadiusKm(label)} ק״מ`;
}
