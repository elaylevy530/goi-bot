/** Product support contact — single source for courier / business / customer UIs. */

export const SUPPORT_PHONE_DISPLAY = "+972 50-981-0021";
export const SUPPORT_WA_DIGITS = "972509810021";
export const SUPPORT_EMAIL = "support@goi.co.il";

export function supportTelUrl() {
  return `tel:+${SUPPORT_WA_DIGITS}`;
}

export function supportWhatsAppUrl(prefilledText?: string) {
  const base = `https://wa.me/${SUPPORT_WA_DIGITS}`;
  if (!prefilledText) return base;
  return `${base}?text=${encodeURIComponent(prefilledText)}`;
}
