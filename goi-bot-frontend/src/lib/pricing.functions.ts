/**
 * Pricing — single source of truth.
 *
 * All price calculations (frontend estimates, backend job creation,
 * launch-readiness checks) go through the Nest pricing module, which reads
 * `pricing_rules` and snapshots the result onto the job at creation time so
 * future rule changes never alter historical orders.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireNestAuth, assertNestAdmin } from "@/integrations/nest/auth-middleware";
import { z } from "zod";
import { nestServerFetch } from "@/lib/nest-server";

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
  .middleware([requireNestAuth])
  .handler(async ({ context }) => {
    return nestServerFetch("/api/pricing/active", {
      accessToken: context.accessToken,
    });
  });

export const computePrice = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
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
    return nestServerFetch<PriceBreakdown>("/api/pricing/compute", {
      method: "POST",
      accessToken: context.accessToken,
      body: {
        distanceKm: data.distanceKm,
        extraStops: data.extraStops ?? 0,
        isHeavy: data.isHeavy ?? false,
      },
    });
  });

/**
 * Admin: update the active pricing rule.
 * Nest creates a new row with incremented version, then flips is_active.
 */
export const updateActivePricing = createServerFn({ method: "POST" })
  .middleware([requireNestAuth])
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
    assertNestAdmin(context);
    return nestServerFetch("/api/pricing/active", {
      method: "POST",
      accessToken: context.accessToken,
      body: data,
    });
  });
