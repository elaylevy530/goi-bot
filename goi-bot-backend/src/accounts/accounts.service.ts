import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, MoreThanOrEqual, Not, Repository } from "typeorm";
import {
  allocateReferralCode,
  ensureCourierReferralCode,
} from "./referral-code";
import { previewCourierId, previewCustomerId } from "../auth/auth-als";
import { normalizePhone } from "../auth/phone.util";
import { Job } from "../jobs/entities/job.entity";
import { BusinessNotification } from "./entities/business-notification.entity";
import { Courier } from "./entities/courier.entity";
import { Customer } from "./entities/customer.entity";
import type { ApproveCourierDto } from "./dto/approve-courier.dto";
import type { CreateCourierAdminDto } from "./dto/create-courier-admin.dto";
import type { UpdateCourierAdminDto } from "./dto/update-courier-admin.dto";
import type { UpdateCourierSelfDto } from "./dto/update-courier-self.dto";
import type { UpdateCustomerAdminDto } from "./dto/update-customer-admin.dto";
import type { UpdateCustomerSelfDto } from "./dto/update-customer-self.dto";

export type SenderClassification =
  | { kind: "courier"; id: string }
  | { kind: "business"; id: string; user_id: string | null }
  | { kind: "unknown"; phone: string };

export type CourierReferralRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  vehicle_type: string | null;
  status: string;
  created_at: Date;
  jobs_completed: number;
  your_profit: number;
  kind: "courier" | "business";
};

export type CourierReferralsPayload = {
  couriers: CourierReferralRow[];
  businesses: CourierReferralRow[];
  totals: {
    couriers_registered: number;
    couriers_active: number;
    businesses_registered: number;
    businesses_active: number;
    profit: number;
    pending: number;
  };
};

@Injectable()
export class AccountsService implements OnModuleInit {
  constructor(
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(BusinessNotification)
    private readonly notifications: Repository<BusinessNotification>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly dataSource: DataSource,
  ) {}

  async classifyPhone(rawPhone: string): Promise<SenderClassification> {
    const phone = normalizePhone(rawPhone);
    const suffix9 = phone.slice(-9);

    const couriers = await this.couriers.find({
      select: ["id", "whatsapp_phone"],
      where: {},
      take: 5000,
    });
    const courierMatch = couriers.find((c) =>
      (c.whatsapp_phone ?? "").replace(/\D/g, "").endsWith(suffix9),
    );
    if (courierMatch) {
      return { kind: "courier", id: courierMatch.id };
    }

    const customers = await this.customers.find({
      select: ["id", "user_id", "phone", "customer_type"],
      where: {},
      take: 5000,
    });
    const bizMatch = customers.find((b) =>
      (b.phone ?? "").replace(/\D/g, "").endsWith(suffix9),
    );
    if (bizMatch) {
      return {
        kind: "business",
        id: bizMatch.id,
        user_id: bizMatch.user_id ?? null,
      };
    }

    return { kind: "unknown", phone };
  }

  // ---- Courier self-service ----

  async onModuleInit() {
    await this.dataSource.query(
      `ALTER TABLE couriers ADD COLUMN IF NOT EXISTS referral_code varchar(16)`,
    );
    await this.dataSource.query(
      `ALTER TABLE couriers ADD COLUMN IF NOT EXISTS referred_by_courier_id uuid`,
    );
    await this.dataSource.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS IDX_couriers_referral_code ON couriers (referral_code)`,
    );
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS IDX_couriers_referred_by_courier_id ON couriers (referred_by_courier_id)`,
    );

    const missing = await this.couriers.find({
      where: { referral_code: IsNull() },
      select: ["id"],
    });
    for (const row of missing) {
      await this.couriers.update(row.id, {
        referral_code: await allocateReferralCode(this.couriers),
      });
    }
  }

  async getMyCourier(userId: string): Promise<Courier> {
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId } })
      : await this.couriers.findOne({ where: { user_id: userId } });
    if (!courier) {
      throw new NotFoundException("Courier profile not found");
    }
    return ensureCourierReferralCode(this.couriers, courier);
  }

  async getMyReferrals(userId: string): Promise<CourierReferralsPayload> {
    const me = await this.getMyCourier(userId);
    const leadSources = new Set<string>([`referral:${me.id}`]);
    if (me.referral_code) {
      leadSources.add(`referral:${me.referral_code}`);
      leadSources.add(`referral:${me.referral_code.toLowerCase()}`);
    }

    const referred = await this.couriers.find({
      where: [
        { referred_by_courier_id: me.id },
        { lead_source: In([...leadSources]) },
      ],
      order: { created_at: "DESC" },
    });

    const seen = new Set<string>();
    const unique = referred.filter((c) => {
      if (c.id === me.id || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    const jobsByCourier = await this.completedJobsByCourier(unique.map((c) => c.id));
    const couriers: CourierReferralRow[] = unique.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      vehicle_type: c.vehicle_type,
      status: c.courier_status,
      created_at: c.created_at,
      jobs_completed: jobsByCourier.get(c.id) ?? 0,
      your_profit: 0,
      kind: "courier",
    }));

    const couriersActive = couriers.filter((c) => c.status === "פעיל").length;
    return {
      couriers,
      businesses: [],
      totals: {
        couriers_registered: couriers.length,
        couriers_active: couriersActive,
        businesses_registered: 0,
        businesses_active: 0,
        profit: 0,
        pending: 0,
      },
    };
  }

  private async completedJobsByCourier(ids: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ids.length === 0) return map;
    const rows = await this.dataSource
      .createQueryBuilder()
      .select("o.courier_id", "courier_id")
      .addSelect("COUNT(*)::int", "n")
      .from("job_outcomes", "o")
      .where("o.courier_id IN (:...ids)", { ids })
      .andWhere("o.delivered_at IS NOT NULL")
      .andWhere("o.was_cancelled = false")
      .groupBy("o.courier_id")
      .getRawMany<{ courier_id: string; n: string | number }>();
    for (const row of rows) {
      map.set(row.courier_id, Number(row.n) || 0);
    }
    return map;
  }

  async updateMyCourier(userId: string, dto: UpdateCourierSelfDto): Promise<Courier> {
    const courier = await this.getMyCourier(userId);
    if (dto.last_lat != null || dto.last_lng != null) {
      courier.last_location_at = new Date();
    }
    Object.assign(courier, dto);
    return this.couriers.save(courier);
  }

  async getMyCustomer(userId: string): Promise<Customer> {
    const previewId = previewCustomerId();
    const customer = previewId
      ? await this.customers.findOne({ where: { id: previewId } })
      : await this.customers.findOne({ where: { user_id: userId } });
    if (!customer) {
      throw new NotFoundException("Customer profile not found");
    }
    return customer;
  }

  async updateMyCustomer(userId: string, dto: UpdateCustomerSelfDto): Promise<Customer> {
    const customer = await this.getMyCustomer(userId);
    if (dto.signed_agreement_name !== undefined) {
      customer.signed_agreement_at = new Date();
    }
    if (dto.payment_method_on_file === true && dto.payment_provider) {
      customer.payment_method_added_at = new Date();
    }
    if (dto.payment_method_on_file === false) {
      customer.payment_method_added_at = null;
      customer.paypal_vault_id = null;
      customer.paypal_payer_id = null;
      customer.paypal_email = null;
      customer.paypal_setup_at = null;
    }
    if (dto.paypal_vault_id) {
      customer.paypal_setup_at = new Date();
    }
    if (dto.niche_details) {
      customer.niche_details = { ...(customer.niche_details ?? {}), ...dto.niche_details };
      delete dto.niche_details;
    }
    Object.assign(customer, dto);
    return this.customers.save(customer);
  }

  // ---- Admin: couriers ----

  async listCouriers(status?: string, limit = 200): Promise<Courier[]> {
    return this.couriers.find({
      where: status ? { courier_status: status } : {},
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  /** Admin manual create — courier row only. Use auth provision-courier for login. */
  async createCourier(dto: CreateCourierAdminDto): Promise<Courier> {
    const phone = normalizePhone(dto.whatsapp_phone);
    if (phone.length < 9) {
      throw new BadRequestException("מספר וואטסאפ לא תקין");
    }
    const existing = await this.couriers
      .createQueryBuilder("c")
      .select("c.id")
      .where("regexp_replace(c.whatsapp_phone, '\\D', '', 'g') LIKE :suffix", {
        suffix: `%${phone.slice(-9)}`,
      })
      .getOne();
    if (existing) {
      throw new ConflictException("מספר וואטסאפ כבר רשום במערכת");
    }

    return this.couriers.save(
      this.couriers.create({
        full_name: dto.full_name.trim(),
        whatsapp_phone: dto.whatsapp_phone.trim(),
        base_city: dto.base_city ?? null,
        gender: dto.gender ?? null,
        vehicle_type: dto.vehicle_type ?? null,
        invoice_status: dto.invoice_status ?? null,
        courier_experience_duration: dto.courier_experience_duration ?? null,
        courier_status: dto.courier_status ?? "נרשם",
        lead_source: dto.lead_source ?? "ידני",
        notes: dto.notes ?? null,
        courier_kind: dto.courier_kind === "mover" ? "mover" : "courier",
        accepting_jobs: false,
        referral_code: await allocateReferralCode(this.couriers),
      }),
    );
  }

  async getCourier(id: string): Promise<Courier> {
    const courier = await this.couriers.findOne({ where: { id } });
    if (!courier) {
      throw new NotFoundException("Courier not found");
    }
    return courier;
  }

  async updateCourier(id: string, dto: UpdateCourierAdminDto): Promise<Courier> {
    const courier = await this.getCourier(id);
    Object.assign(courier, dto);
    return this.couriers.save(courier);
  }

  /** Admin approves a pending courier. Optionally keeps them paused until manually activated. */
  async approveCourier(id: string, dto: ApproveCourierDto): Promise<Courier> {
    const courier = await this.getCourier(id);
    const isSuspended = dto.suspended === true;
    courier.courier_status = "פעיל";
    courier.is_paused = isSuspended;
    courier.paused_at = isSuspended ? new Date() : null;
    courier.paused_reason = isSuspended ? "ממתין להפעלה ידנית על ידי מנהל" : null;
    return this.couriers.save(courier);
  }

  async deleteCourier(id: string): Promise<{ ok: true }> {
    const result = await this.couriers.delete(id);
    if (!result.affected) {
      throw new NotFoundException("Courier not found");
    }
    return { ok: true as const };
  }

  // ---- Admin: customers ----

  async listCustomers(status?: string, limit = 200): Promise<Customer[]> {
    return this.customers.find({
      where: status ? { status } : {},
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  async getCustomer(id: string): Promise<Customer> {
    const customer = await this.customers.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  async updateCustomer(id: string, dto: UpdateCustomerAdminDto): Promise<Customer> {
    const customer = await this.getCustomer(id);
    Object.assign(customer, dto);
    return this.customers.save(customer);
  }

  async createCustomer(dto: UpdateCustomerAdminDto & { name: string; phone: string }): Promise<Customer> {
    return this.customers.save(
      this.customers.create({
        name: dto.name,
        phone: dto.phone,
        customer_type: dto.customer_type ?? "אחר",
        business_name: dto.business_name ?? null,
        city: dto.city ?? null,
        address: dto.address ?? null,
        status: dto.status ?? "חדש",
      }),
    );
  }

  async getAdminDashboardStats() {
    const today = new Date().toISOString().slice(0, 10);
    const [
      totalCouriers,
      registeredToday,
      activeCouriers,
      pendingApproval,
      missingDetails,
      totalCustomers,
      newCustomers,
      openJobs,
      jobsToday,
      unassignedJobs,
    ] = await Promise.all([
      this.couriers.count(),
      this.couriers.count({ where: { created_at: MoreThanOrEqual(new Date(`${today}T00:00:00.000Z`)) } }),
      this.couriers.count({ where: { courier_status: "פעיל" } }),
      this.couriers.count({ where: { courier_status: "ממתין לאישור" } }),
      this.couriers.count({ where: { courier_status: "חסר פרטים" } }),
      this.customers.count(),
      this.customers.count({ where: { status: "חדש" } }),
      this.jobs.count({ where: { status: Not(In(["הושלמה", "בוטלה"])) } }),
      this.jobs.count({
        where: {
          created_at: MoreThanOrEqual(new Date(`${today}T00:00:00.000Z`)),
          status: Not("טיוטה"),
        },
      }),
      this.jobs.count({
        where: {
          selected_courier_id: IsNull(),
          status: Not("טיוטה"),
        },
      }),
    ]);

    let pendingWithdrawals = 0;
    try {
      const rows = await this.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM withdrawal_requests WHERE status = $1`,
        ["ממתינה"],
      );
      pendingWithdrawals = Number(rows[0]?.count ?? 0);
    } catch {
      pendingWithdrawals = 0;
    }

    return {
      stats: {
        total_couriers: totalCouriers,
        registered_today: registeredToday,
        active_couriers: activeCouriers,
        pending_approval: pendingApproval,
        total_customers: totalCustomers,
        open_jobs: openJobs,
        jobs_sent_today: jobsToday,
        courier_replies_today: 0,
      },
      attention: [
        { label: "שליחים שחסר להם מידע", count: missingDetails, to: "/couriers" },
        { label: "שליחים חדשים לא מאושרים", count: pendingApproval, to: "/couriers" },
        { label: "מזמינים חדשים", count: newCustomers, to: "/customers" },
        { label: "עבודות בלי שליח", count: unassignedJobs, to: "/jobs" },
        { label: "בקשות משיכה ממתינות", count: pendingWithdrawals, to: "/withdrawals" },
      ],
    };
  }

  async listMyNotifications(userId: string, limit = 8) {
    const customer = await this.getMyCustomer(userId);
    return this.notifications.find({
      where: { business_id: customer.id },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  async countUnreadNotifications(userId: string) {
    const customer = await this.getMyCustomer(userId);
    return this.notifications.count({
      where: { business_id: customer.id, read_at: IsNull() },
    });
  }

  async markAllNotificationsRead(userId: string) {
    const customer = await this.getMyCustomer(userId);
    await this.notifications.update(
      { business_id: customer.id, read_at: IsNull() },
      { read_at: new Date() },
    );
    return { ok: true as const };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const customer = await this.getMyCustomer(userId);
    await this.notifications.update(
      { id: notificationId, business_id: customer.id },
      { read_at: new Date() },
    );
    return { ok: true as const };
  }
}
