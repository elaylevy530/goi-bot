import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  // Category (required) — chosen upfront at signup, drives delivery-form templates.
  business_category: z.string().trim().min(2).max(60),
  service_type: serviceTypeEnum,
  // Extended optional fields
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

/**
 * Public: extended self sign-up for a business.
 * Always approved; dispatch is blocked until payment_method_on_file = true.
 */
export const signupBusiness = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalizePhone(data.phone);
    const email = data.email && data.email.trim() ? data.email.trim() : businessPhoneToEmail(phone);

    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing?.user_id) {
      throw new Error("כבר קיים חשבון לטלפון הזה. נסה להיכנס.");
    }

    let userId: string;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, role: "business", business_name: data.business_name },
    });
    if (createErr) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error(createErr.message);
      await supabaseAdmin.auth.admin.updateUserById(found.id, { password: data.password });
      userId = found.id;
    } else {
      userId = created.user!.id;
    }

    const nowIso = new Date().toISOString();
    const payload = {
      user_id: userId,
      name: data.full_name,
      business_name: data.business_name,
      city: data.city || null,
      address: data.address || null,
      status: "פעיל",
      customer_type: "עסק מקומי",
      last_temp_password: data.password,
      password_set_at: nowIso,
      business_niche: data.business_niche,
      business_category: data.business_category,
      service_type: data.service_type,
      niche_details: data.niche_details,
      business_tax_id: data.business_tax_id || null,
      website_url: data.website_url || null,
      logo_url: data.logo_url || null,
      operating_hours: data.operating_hours,
      service_areas: data.service_areas,
      preferred_vehicle_types: data.preferred_vehicle_types,
      default_pricing_type: data.default_pricing_type,
      default_delivery_window_minutes: data.default_delivery_window_minutes,
      pickup_contact_name: data.pickup_contact_name || null,
      pickup_contact_phone: data.pickup_contact_phone || null,
      pickup_address: data.pickup_address || data.address || null,
      marketing_opt_in: data.marketing_opt_in,
      terms_accepted_at: nowIso,
      payment_method_on_file: false,
      dispatch_blocked_reason: "ללא אמצעי תשלום שמור",
    } as never;

    if (existing) {
      await supabaseAdmin.from("customers").update(payload).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("customers").insert({ ...(payload as object), phone } as never);
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "business" as never }, { onConflict: "user_id,role" });

    return { ok: true, login_phone: phone, business_niche: data.business_niche };
  });

/**
 * Authenticated: mark the current business as having a payment method on file.
 * NOTE: temporary manual confirmation until Stripe Setup Intent is wired in.
 * The bearer is the signed-in business user; updates are scoped via user_id.
 */
export const markPaymentMethodOnFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    last4: z.string().trim().regex(/^\d{4}$/),
    brand: z.string().trim().min(2).max(30),
    provider: z.string().trim().min(2).max(30).default("manual"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({
        payment_method_on_file: true,
        payment_method_last4: data.last4,
        payment_method_brand: data.brand,
        payment_provider: data.provider,
        payment_method_added_at: new Date().toISOString(),
        dispatch_blocked_reason: null,
      } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({
        payment_method_on_file: false,
        payment_method_last4: null,
        payment_method_brand: null,
        payment_provider: null,
        payment_method_added_at: null,
        dispatch_blocked_reason: "ללא אמצעי תשלום שמור",
      } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Authenticated: record that the business signed the service agreement.
 * Stores signer name + timestamp + version. Required before entering the panel.
 */
export const signServiceAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    signer_name: z.string().trim().min(2).max(120),
    version: z.string().trim().min(1).max(20).default("v1"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({
        signed_agreement_at: new Date().toISOString(),
        signed_agreement_name: data.signer_name,
        signed_agreement_version: data.version,
      } as never)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

