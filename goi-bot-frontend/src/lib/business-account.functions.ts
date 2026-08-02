import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { nestServerFetch } from "@/lib/nest-server";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

export function businessPhoneToEmail(raw: string): string {
  return `${normalizePhone(raw)}@business.goi.local`;
}

const nicheEnum = z.enum([
  "manual_dispatch",
  "local_business",
  "restaurant",
  "online_store",
  "pharmacy_clinic",
  "integration_business",
]);

const serviceTypeEnum = z.enum(["couriers", "moving", "mixed"]);

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  business_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  password: z.string().min(6).max(72),
  business_niche: nicheEnum.default("manual_dispatch"),
  niche_details: z.record(z.string(), z.any()).optional().default({}),
  business_category: z.string().trim().min(2).max(60),
  service_type: serviceTypeEnum,
  business_tax_id: z.string().trim().max(20).optional().default(""),
  website_url: z.string().trim().max(200).optional().default(""),
  logo_url: z.string().trim().max(500).optional().default(""),
  operating_hours: z.record(z.string(), z.any()).optional().default({}),
  service_areas: z.array(z.string()).optional().default([]),
  preferred_vehicle_types: z.array(z.string()).optional().default([]),
  default_pricing_type: z.enum(["fixed_price", "distance_based", "quote_request"]).optional().default("distance_based"),
  default_delivery_window_minutes: z.number().int().min(15).max(720).optional().default(90),
  pickup_contact_name: z.string().trim().max(80).optional().default(""),
  pickup_contact_phone: z.string().trim().max(20).optional().default(""),
  pickup_address: z.string().trim().max(200).optional().default(""),
  marketing_opt_in: z.boolean().optional().default(false),
  terms_accepted: z.literal(true),
});

export const signupBusiness = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async () => {
    throw new Error(
      "BLOCKED: business signup uses Nest POST /api/auth/register/business.",
    );
  });

export const markPaymentMethodOnFile = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    last4: z.string().trim().regex(/^\d{4}$/),
    brand: z.string().trim().min(2).max(30),
    provider: z.string().trim().min(2).max(30).default("manual"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await nestServerFetch("/api/accounts/customers/me", {
      accessToken: context.accessToken,
      method: "PATCH",
      body: {
        payment_method_on_file: true,
        payment_method_last4: data.last4,
        payment_method_brand: data.brand,
        payment_provider: data.provider,
        dispatch_blocked_reason: null,
      },
    });
    return { ok: true };
  });

export const removePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    await nestServerFetch("/api/accounts/customers/me", {
      accessToken: context.accessToken,
      method: "PATCH",
      body: {
        payment_method_on_file: false,
        payment_method_last4: null,
        payment_method_brand: null,
        payment_provider: null,
        dispatch_blocked_reason: "ללא אמצעי תשלום שמור",
      },
    });
    return { ok: true };
  });

export const signServiceAgreement = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
  .inputValidator((d: unknown) => z.object({
    signer_name: z.string().trim().min(2).max(120),
    version: z.string().trim().min(1).max(20).default("v1"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await nestServerFetch("/api/accounts/customers/me", {
      accessToken: context.accessToken,
      method: "PATCH",
      body: {
        signed_agreement_name: data.signer_name,
        signed_agreement_version: data.version,
      },
    });
    return { ok: true };
  });
