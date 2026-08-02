/** Normalize Israeli phone numbers to digits starting with 972. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function customerPhoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@customers.goi.local`;
}

export function businessPhoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@business.goi.local`;
}

export function courierPhoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@couriers.goi.local`;
}
