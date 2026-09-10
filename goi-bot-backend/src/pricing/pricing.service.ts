import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PricingRule } from "./entities/pricing-rule.entity";
import { Customer } from "../accounts/entities/customer.entity";

type BusinessPricingModel = "distance_based" | "fixed_price" | "city_radius";
type BusinessPricingZone = {
  city?: string;
  radius_km?: number;
  fixed_price?: number;
};
type BusinessPricingConfig = {
  model?: BusinessPricingModel;
  base_price?: number;
  price_per_km?: number;
  minimum_price?: number;
  fixed_price?: number;
  zones?: BusinessPricingZone[];
};

function finiteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeCity(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("he")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule)
    private readonly rules: Repository<PricingRule>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
  ) {}

  getActive() {
    return this.rules.findOne({ where: { is_active: true } });
  }

  async compute(distanceKm: number, extraStops = 0, isHeavy = false) {
    const rule = await this.getActive();
    if (!rule) {
      throw new NotFoundException("No active pricing rule");
    }
    const base = Number(rule.base_price ?? 0);
    const perKm = Number(rule.price_per_km ?? 0);
    const minPrice = Number(rule.minimum_price ?? 0);
    const stopFee = Number(rule.extra_stop_fee ?? 0);
    const heavy = isHeavy ? Number(rule.heavy_package_surcharge ?? 0) : 0;
    const distancePrice = distanceKm * perKm;
    const surcharges = extraStops * stopFee + heavy;
    const subtotal = Math.max(minPrice, base + distancePrice + surcharges);
    const feePct = Number(rule.platform_fee_percent ?? 0);
    const feeFixed = Number(rule.platform_fee_fixed ?? 0);
    const platform_fee = (subtotal * feePct) / 100 + feeFixed;
    const courier_payout = Math.max(0, subtotal - platform_fee);
    return {
      pricing_version: rule.version ?? 1,
      pricing_rule_id: rule.id,
      base_price: base,
      distance_km: distanceKm,
      distance_price: distancePrice,
      surcharges,
      subtotal,
      business_total: subtotal,
      platform_fee,
      courier_payout,
      computed_at: new Date().toISOString(),
    };
  }

  async computeForCustomer(
    userId: string,
    customerId: string | undefined,
    distanceKm: number,
    extraStops = 0,
    isHeavy = false,
    dropoffCity?: string,
  ) {
    const customer = customerId
      ? await this.customers.findOne({ where: { id: customerId } })
      : await this.customers.findOne({ where: { user_id: userId } });
    if (!customer) return this.compute(distanceKm, extraStops, isHeavy);

    const config = ((customer.niche_details?.pricing_config ?? {}) as BusinessPricingConfig);
    const model = (customer.default_pricing_type || config.model || "distance_based") as BusinessPricingModel;
    const rule = await this.getActive();
    if (!rule) throw new NotFoundException("No active pricing rule");

    const platformBase = Number(rule.base_price ?? 0);
    const platformPerKm = Number(rule.price_per_km ?? 0);
    const platformMinimum = Number(rule.minimum_price ?? 0);
    const stopFee = Number(rule.extra_stop_fee ?? 0);
    const heavyFee = isHeavy ? Number(rule.heavy_package_surcharge ?? 0) : 0;
    const surcharges = extraStops * stopFee + heavyFee;
    let appliedSurcharges = surcharges;

    let base = finiteNumber(config.base_price) ?? platformBase;
    let perKm = finiteNumber(config.price_per_km) ?? platformPerKm;
    let minimum = finiteNumber(config.minimum_price) ?? platformMinimum;
    let matchedZone: BusinessPricingZone | null = null;
    let subtotal: number;

    if (model === "fixed_price") {
      base =
        finiteNumber(customer.default_delivery_price) ??
        finiteNumber(config.fixed_price) ??
        platformMinimum;
      perKm = 0;
      minimum = base;
      appliedSurcharges = 0;
      subtotal = base;
    } else if (model === "city_radius") {
      const city = normalizeCity(dropoffCity);
      matchedZone =
        (Array.isArray(config.zones) ? config.zones : []).find((zone) => {
          const zoneCity = normalizeCity(zone.city);
          const radius = finiteNumber(zone.radius_km);
          return !!city && !!zoneCity && city === zoneCity && radius != null && distanceKm <= radius;
        }) ?? null;
      const zonePrice = finiteNumber(matchedZone?.fixed_price);
      const fallback =
        finiteNumber(customer.default_delivery_price) ??
        finiteNumber(config.fixed_price);
      base = zonePrice ?? fallback ?? platformMinimum;
      perKm = 0;
      minimum = base;
      appliedSurcharges = 0;
      subtotal = base;
    } else {
      subtotal = Math.max(minimum, base + distanceKm * perKm + surcharges);
    }

    const distancePrice = distanceKm * perKm;
    const feePct = Number(rule.platform_fee_percent ?? 0);
    const feeFixed = Number(rule.platform_fee_fixed ?? 0);
    const platformFee = (subtotal * feePct) / 100 + feeFixed;

    return {
      pricing_version: rule.version ?? 1,
      pricing_rule_id: rule.id,
      pricing_type: model,
      matched_zone: matchedZone?.city ?? null,
      base_price: base,
      price_per_km: perKm,
      distance_km: distanceKm,
      distance_price: distancePrice,
      surcharges: appliedSurcharges,
      subtotal,
      business_total: subtotal,
      platform_fee: platformFee,
      courier_payout: Math.max(0, subtotal - platformFee),
      computed_at: new Date().toISOString(),
    };
  }

  async replaceActive(input: Partial<PricingRule> & {
    base_price: number;
    price_per_km: number;
    minimum_price: number;
    platform_fee_percent: number;
  }) {
    const current = await this.getActive();
    const nextVersion = (current?.version ?? 0) + 1;
    if (current) {
      current.is_active = false;
      await this.rules.save(current);
    }
    return this.rules.save(
      this.rules.create({
        base_price: String(input.base_price),
        price_per_km: String(input.price_per_km),
        minimum_price: String(input.minimum_price),
        platform_fee_percent: String(input.platform_fee_percent),
        platform_fee_fixed: String(input.platform_fee_fixed ?? 0),
        waiting_fee_per_minute: String(input.waiting_fee_per_minute ?? 0),
        extra_stop_fee: String(input.extra_stop_fee ?? 0),
        heavy_package_surcharge: String(input.heavy_package_surcharge ?? 0),
        night_surcharge_percent: String(input.night_surcharge_percent ?? 0),
        weekend_surcharge_percent: String(input.weekend_surcharge_percent ?? 0),
        notes: input.notes ?? null,
        version: nextVersion,
        is_active: true,
        name: `Rule v${nextVersion}`,
      }),
    );
  }
}
