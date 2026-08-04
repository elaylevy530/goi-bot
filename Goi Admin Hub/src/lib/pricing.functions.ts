/**
 * Pricing — single source of truth.
 *
 * All price calculations (frontend estimates, backend job creation,
 * launch-readiness checks) read from public.pricing_rules via the
 * compute_job_price() SQL function. The result is snapshotted onto the
 * job at creation time so future rule changes never alter historical orders.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PriceBreakdown = {
  pricing_version: number;
  pricing_rule_id: string;
  base_price: number;
  distance_km: number;
  distance_price: number;
  surcharges: number;
  subtotal: number;
  business_total: number;
  platform_fee: number;
  courier_payout: number;
  computed_at: string;
  error?: string;
};

export const getActivePricingRule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pricing_rules")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const computePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { distanceKm: number; extraStops?: number; isHeavy?: boolean }) =>
    z
      .object({
        distanceKm: z.number().min(0),
        extraStops: z.number().int().min(0).optional().default(0),
        isHeavy: z.boolean().optional().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("compute_job_price", {
      _distance_km: data.distanceKm,
      _extra_stops: data.extraStops ?? 0,
      _is_heavy: data.isHeavy ?? false,
    });
    if (error) throw new Error(error.message);
    return result as PriceBreakdown;
  });

/**
 * Admin: update the active pricing rule.
 * Creates a new row with incremented version, then flips is_active.
 */
export const updateActivePricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    z
      .object({
        base_price: z.number().min(0),
        price_per_km: z.number().min(0),
        minimum_price: z.number().min(0),
        platform_fee_percent: z.number().min(0).max(100),
        platform_fee_fixed: z.number().min(0).optional().default(0),
        waiting_fee_per_minute: z.number().min(0).optional().default(0),
        extra_stop_fee: z.number().min(0).optional().default(0),
        heavy_package_surcharge: z.number().min(0).optional().default(0),
        night_surcharge_percent: z.number().min(0).max(100).optional().default(0),
        weekend_surcharge_percent: z.number().min(0).max(100).optional().default(0),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // verify admin
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin
      .from("pricing_rules")
      .select("version")
      .eq("is_active", true)
      .maybeSingle();
    const nextVersion = ((current as { version?: number } | null)?.version ?? 0) + 1;

    // Deactivate current
    await supabaseAdmin
      .from("pricing_rules")
      .update({ is_active: false } as never)
      .eq("is_active", true);

    const { data: inserted, error } = await supabaseAdmin
      .from("pricing_rules")
      .insert({ ...data, version: nextVersion, is_active: true, name: `Rule v${nextVersion}` } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });
