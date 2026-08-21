/**
 * Israeli billing address for PayPal AVS.
 * PayPal rejects short street-only lines like "Mor 3" unless city + 7-digit zip are included.
 */

export type PaypalBillingDraft = {
  street: string;
  city: string;
  postalCode: string;
};

export type PaypalCardFieldsBilling = {
  addressLine1: string;
  adminArea2: string;
  postalCode: string;
  countryCode: "IL";
};

export type PaypalApiBillingAddress = {
  address_line_1: string;
  admin_area_2: string;
  postal_code: string;
  country_code: "IL";
};

const IL_POSTAL = /\b(\d{7})\b/;

export function extractIsraeliPostal(...parts: Array<string | null | undefined>): string {
  for (const part of parts) {
    const match = String(part ?? "").match(IL_POSTAL);
    if (match) return match[1];
  }
  return "";
}

function stripPostal(value: string): string {
  return value
    .replace(/\b\d{7}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[,\s]+$/g, "")
    .replace(/^[,\s]+/g, "")
    .trim();
}

export function billingFromBusiness(me: {
  address?: string | null;
  city?: string | null;
  pickup_address?: string | null;
} | null | undefined): PaypalBillingDraft {
  const pickup = String(me?.pickup_address ?? "").trim();
  let street = String(me?.address ?? "").trim();
  let city = String(me?.city ?? "").trim();

  if (!street && pickup) {
    const parts = pickup.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      city = city || parts[parts.length - 1];
      street = parts.slice(0, -1).join(", ");
    } else {
      street = pickup;
    }
  }

  if (street && !city) {
    const parts = street.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      city = parts[parts.length - 1];
      street = parts.slice(0, -1).join(", ");
    }
  }

  const postalCode = extractIsraeliPostal(me?.address, me?.pickup_address, street, city);
  return {
    street: stripPostal(street),
    city: stripPostal(city),
    postalCode,
  };
}

export function validatePaypalIlBilling(input: PaypalBillingDraft): string | null {
  const street = input.street.trim();
  const city = input.city.trim();
  const postal = input.postalCode.replace(/\D/g, "");
  if (street.length < 3) return "יש למלא רחוב ומספר בית";
  if (!/\d/.test(street)) return "יש לכלול מספר בית בכתובת (למשל רחוב הרצל 12)";
  if (city.length < 2) return "יש למלא עיר";
  if (postal.length !== 7) return "מיקוד ישראלי הוא 7 ספרות";
  return null;
}

/** PayPal IL AVS fails on short street-only values; always send "street, city". */
export function toPaypalCardFieldsBilling(input: PaypalBillingDraft): PaypalCardFieldsBilling {
  const street = input.street.trim();
  const city = input.city.trim();
  const postalCode = input.postalCode.replace(/\D/g, "");
  const alreadyHasCity = city.length > 0 && street.toLowerCase().includes(city.toLowerCase());
  return {
    addressLine1: alreadyHasCity ? street : `${street}, ${city}`,
    adminArea2: city,
    postalCode,
    countryCode: "IL",
  };
}

export function toPaypalApiBilling(input: PaypalBillingDraft): PaypalApiBillingAddress {
  const card = toPaypalCardFieldsBilling(input);
  return {
    address_line_1: card.addressLine1,
    admin_area_2: card.adminArea2,
    postal_code: card.postalCode,
    country_code: card.countryCode,
  };
}

export async function submitPaypalCardFields(
  form: { submit: (options?: unknown) => Promise<unknown> },
  draft: PaypalBillingDraft,
): Promise<void> {
  await form.submit({ billingAddress: toPaypalCardFieldsBilling(draft) });
}
