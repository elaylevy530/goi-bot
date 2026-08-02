import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import type { AppRole } from "../auth/auth.types";
import { BusinessPushSubscription } from "./entities/business-push-subscription.entity";
import { CourierPushSubscription } from "./entities/courier-push-subscription.entity";
import { CustomerPushSubscription } from "./entities/customer-push-subscription.entity";

type PushKeys = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

function parseSub(subscription: PushKeys) {
  const endpoint = subscription?.endpoint?.trim();
  const p256dh = subscription?.keys?.p256dh?.trim();
  const auth = subscription?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    throw new BadRequestException("Invalid push subscription");
  }
  return { endpoint, p256dh, auth };
}

@Injectable()
export class PushSubscriptionsService {
  constructor(
    @InjectRepository(CourierPushSubscription)
    private readonly courierSubs: Repository<CourierPushSubscription>,
    @InjectRepository(BusinessPushSubscription)
    private readonly businessSubs: Repository<BusinessPushSubscription>,
    @InjectRepository(CustomerPushSubscription)
    private readonly customerSubs: Repository<CustomerPushSubscription>,
    @InjectRepository(Courier)
    private readonly couriers: Repository<Courier>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
  ) {}

  private isAdmin(roles: AppRole[]) {
    return roles.includes("admin") || roles.includes("manager");
  }

  async upsertCourier(
    userId: string,
    roles: AppRole[],
    courierId: string,
    subscription: PushKeys,
    userAgent?: string | null,
  ) {
    const courier = await this.couriers.findOne({ where: { id: courierId } });
    if (!courier) throw new NotFoundException("Courier not found");
    if (!this.isAdmin(roles) && courier.user_id !== userId) {
      throw new ForbiddenException("Courier access denied");
    }

    const keys = parseSub(subscription);
    const existing = await this.courierSubs.findOne({
      where: { courier_id: courierId, endpoint: keys.endpoint },
    });
    if (existing) {
      existing.auth = keys.auth;
      existing.p256dh = keys.p256dh;
      existing.user_agent = userAgent ?? existing.user_agent;
      existing.last_used_at = new Date();
      return this.courierSubs.save(existing);
    }
    return this.courierSubs.save(
      this.courierSubs.create({
        courier_id: courierId,
        endpoint: keys.endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
        user_agent: userAgent ?? null,
        last_used_at: new Date(),
      }),
    );
  }

  async deleteCourier(userId: string, roles: AppRole[], courierId: string) {
    const courier = await this.couriers.findOne({ where: { id: courierId } });
    if (!courier) throw new NotFoundException("Courier not found");
    if (!this.isAdmin(roles) && courier.user_id !== userId) {
      throw new ForbiddenException("Courier access denied");
    }
    await this.courierSubs.delete({ courier_id: courierId });
    return { ok: true as const };
  }

  async upsertBusiness(
    userId: string,
    roles: AppRole[],
    businessId: string,
    subscription: PushKeys,
    userAgent?: string | null,
  ) {
    const business = await this.customers.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException("Business not found");
    if (!this.isAdmin(roles) && business.user_id !== userId) {
      throw new ForbiddenException("Business access denied");
    }

    const keys = parseSub(subscription);
    const existing = await this.businessSubs.findOne({
      where: { business_id: businessId, endpoint: keys.endpoint },
    });
    if (existing) {
      existing.auth = keys.auth;
      existing.p256dh = keys.p256dh;
      existing.user_agent = userAgent ?? existing.user_agent;
      existing.last_used_at = new Date();
      return this.businessSubs.save(existing);
    }
    return this.businessSubs.save(
      this.businessSubs.create({
        business_id: businessId,
        endpoint: keys.endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
        user_agent: userAgent ?? null,
        last_used_at: new Date(),
      }),
    );
  }

  async upsertCustomer(
    userId: string,
    roles: AppRole[],
    targetUserId: string,
    subscription: PushKeys,
    userAgent?: string | null,
  ) {
    if (!this.isAdmin(roles) && targetUserId !== userId) {
      throw new ForbiddenException("Customer access denied");
    }

    const keys = parseSub(subscription);
    const existing = await this.customerSubs.findOne({
      where: { user_id: targetUserId, endpoint: keys.endpoint },
    });
    if (existing) {
      existing.auth = keys.auth;
      existing.p256dh = keys.p256dh;
      existing.user_agent = userAgent ?? existing.user_agent;
      existing.last_used_at = new Date();
      return this.customerSubs.save(existing);
    }
    return this.customerSubs.save(
      this.customerSubs.create({
        user_id: targetUserId,
        endpoint: keys.endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
        user_agent: userAgent ?? null,
        last_used_at: new Date(),
      }),
    );
  }
}
