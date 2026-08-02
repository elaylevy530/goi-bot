import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, MoreThanOrEqual, Not, Repository } from "typeorm";
import { normalizePhone } from "../auth/phone.util";
import { Job } from "../jobs/entities/job.entity";
import { BusinessNotification } from "./entities/business-notification.entity";
import { Courier } from "./entities/courier.entity";
import { Customer } from "./entities/customer.entity";
import type { ApproveCourierDto } from "./dto/approve-courier.dto";
import type { UpdateCourierAdminDto } from "./dto/update-courier-admin.dto";
import type { UpdateCourierSelfDto } from "./dto/update-courier-self.dto";
import type { UpdateCustomerAdminDto } from "./dto/update-customer-admin.dto";
import type { UpdateCustomerSelfDto } from "./dto/update-customer-self.dto";

export type SenderClassification =
  | { kind: "courier"; id: string }
  | { kind: "business"; id: string; user_id: string | null }
  | { kind: "unknown"; phone: string };

@Injectable()
export class AccountsService {
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

  async getMyCourier(userId: string): Promise<Courier> {
    const courier = await this.couriers.findOne({ where: { user_id: userId } });
    if (!courier) {
      throw new NotFoundException("Courier profile not found");
    }
    return courier;
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
    const customer = await this.customers.findOne({ where: { user_id: userId } });
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
