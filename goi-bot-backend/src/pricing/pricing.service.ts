import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PricingRule } from "./entities/pricing-rule.entity";

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule)
    private readonly rules: Repository<PricingRule>,
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
