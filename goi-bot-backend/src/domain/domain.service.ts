import { randomUUID } from "crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { CourierAdminNotification } from "../accounts/entities/courier-admin-notification.entity";
import { WithdrawalRequest } from "../accounts/entities/withdrawal-request.entity";
import { CourierBonus } from "../accounts/entities/courier-bonus.entity";
import { previewCourierId, previewCustomerId } from "../auth/auth-als";
import type { AppRole } from "../auth/auth.types";
import { Message } from "../chat/entities/message.entity";
import { ExpressPricingRule } from "../jobs/entities/express-pricing-rule.entity";
import { JobOutcome } from "../jobs/entities/job-outcome.entity";
import { StatusLog } from "../jobs/entities/status-log.entity";
import { Area } from "../platform/entities/area.entity";
import { Conversation } from "../push/entities/conversation.entity";
import { SupportTicket } from "../support/entities/support-ticket.entity";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { BusinessBranch } from "../accounts/entities/business-branch.entity";
import { BusinessIntegration } from "../accounts/entities/business-integration.entity";
import { BusinessFavoriteCourier } from "../accounts/entities/business-favorite-courier.entity";
import { IntegrationRequestLog } from "../accounts/entities/integration-request-log.entity";
import { BillingRecord } from "../payments/entities/billing-record.entity";
import { Job } from "../jobs/entities/job.entity";
import { OfferEvent } from "../jobs/entities/offer-event.entity";
import { WaMaintenance } from "../whatsapp/entities/wa-maintenance.entity";

type Mutable = Record<string, unknown>;

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(JobOutcome) private readonly outcomes: Repository<JobOutcome>,
    @InjectRepository(StatusLog) private readonly logs: Repository<StatusLog>,
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(CourierAdminNotification)
    private readonly notifications: Repository<CourierAdminNotification>,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawals: Repository<WithdrawalRequest>,
    @InjectRepository(CourierBonus) private readonly bonuses: Repository<CourierBonus>,
    @InjectRepository(WaMaintenance) private readonly maintenance: Repository<WaMaintenance>,
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(ExpressPricingRule)
    private readonly expressPricing: Repository<ExpressPricingRule>,
    @InjectRepository(Area) private readonly areas: Repository<Area>,
    @InjectRepository(CourierStats) private readonly courierStats: Repository<CourierStats>,
    @InjectRepository(BusinessBranch) private readonly branches: Repository<BusinessBranch>,
    @InjectRepository(BusinessIntegration) private readonly integrations: Repository<BusinessIntegration>,
    @InjectRepository(BusinessFavoriteCourier) private readonly favorites: Repository<BusinessFavoriteCourier>,
    @InjectRepository(IntegrationRequestLog) private readonly integrationLogs: Repository<IntegrationRequestLog>,
    @InjectRepository(BillingRecord) private readonly billingRecords: Repository<BillingRecord>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(OfferEvent) private readonly offerEvents: Repository<OfferEvent>,
  ) {}

  getOutcome(jobId: string) {
    return this.outcomes.findOne({ where: { job_id: jobId } });
  }

  async putOutcome(jobId: string, body: Mutable) {
    const existing = await this.outcomes.findOne({ where: { job_id: jobId } });
    const outcome = existing ?? this.outcomes.create({ job_id: jobId });
    Object.assign(outcome, body, { job_id: jobId });
    return this.outcomes.save(outcome);
  }

  statusLogs(jobId: string) {
    return this.logs.find({
      where: { entity_id: jobId, entity_type: "job" },
      order: { created_at: "ASC" },
    });
  }

  private async identities(userId: string) {
    const previewC = previewCourierId();
    const previewB = previewCustomerId();
    if (previewC || previewB) {
      return { courierId: previewC, businessId: previewB };
    }
    const [courier, business] = await Promise.all([
      this.couriers.findOne({ where: { user_id: userId }, select: ["id"] }),
      this.customers.findOne({ where: { user_id: userId }, select: ["id"] }),
    ]);
    return { courierId: courier?.id, businessId: business?.id };
  }

  async listConversations(userId: string, roles: AppRole[]) {
    if (roles.includes("admin") || roles.includes("manager")) {
      return this.conversations.find({ order: { last_message_at: "DESC" } });
    }
    const ids = await this.identities(userId);
    if (roles.includes("courier") && ids.courierId) {
      return this.conversations.find({
        where: { courier_id: ids.courierId },
        order: { last_message_at: "DESC" },
      });
    }
    if ((roles.includes("business") || roles.includes("customer")) && ids.businessId) {
      return this.conversations.find({
        where: { business_id: ids.businessId },
        order: { last_message_at: "DESC" },
      });
    }
    return [];
  }

  async openConversation(userId: string, roles: AppRole[], body: Mutable) {
    const ids = await this.identities(userId);
    const courierId = (body.courier_id as string | undefined) ?? ids.courierId ?? null;
    const businessId = (body.business_id as string | undefined) ?? ids.businessId ?? null;
    const kind = String(body.kind ?? (courierId && businessId ? "courier_business" : courierId ? "courier_support" : "business_support"));
    const jobId = (body.job_id as string | undefined) ?? null;
    const query = this.conversations
      .createQueryBuilder("conversation")
      .where("conversation.kind = :kind", { kind });
    courierId
      ? query.andWhere("conversation.courier_id = :courierId", { courierId })
      : query.andWhere("conversation.courier_id IS NULL");
    businessId
      ? query.andWhere("conversation.business_id = :businessId", { businessId })
      : query.andWhere("conversation.business_id IS NULL");
    jobId
      ? query.andWhere("conversation.job_id = :jobId", { jobId })
      : query.andWhere("conversation.job_id IS NULL");
    let conversation = await query.getOne();
    if (!conversation) {
      conversation = await this.conversations.save(
        this.conversations.create({
          kind: kind as Conversation["kind"],
          courier_id: courierId,
          business_id: businessId,
          job_id: jobId,
          subject: (body.subject as string | undefined) ?? null,
          last_message_at: new Date(),
          last_message_preview: null,
          unread_admin: 0,
          unread_business: 0,
          unread_courier: 0,
        }),
      );
    }
    await this.assertConversationAccess(conversation, userId, roles);
    return conversation;
  }

  private async assertConversationAccess(
    conversation: Conversation,
    userId: string,
    roles: AppRole[],
  ) {
    if (roles.includes("admin") || roles.includes("manager")) return;
    const ids = await this.identities(userId);
    if (
      (ids.courierId && conversation.courier_id === ids.courierId) ||
      (ids.businessId && conversation.business_id === ids.businessId)
    ) return;
    throw new ForbiddenException("Conversation access denied");
  }

  async listMessages(id: string, userId: string, roles: AppRole[]) {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    await this.assertConversationAccess(conversation, userId, roles);
    return this.messages.find({
      where: { conversation_id: id },
      order: { created_at: "ASC" },
    });
  }

  async postMessage(id: string, userId: string, roles: AppRole[], body: Mutable) {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    await this.assertConversationAccess(conversation, userId, roles);
    const senderRole = roles.includes("admin") || roles.includes("manager")
      ? "admin"
      : roles.includes("courier") ? "courier" : "business";
    const message = await this.messages.save(this.messages.create({
      conversation_id: id,
      sender_user_id: userId,
      sender_role: senderRole,
      body: (body.body as string | undefined) ?? null,
      attachment_url: (body.attachment_url as string | undefined) ?? null,
      attachment_kind: (body.attachment_kind as string | undefined) ?? null,
      attachment_name: (body.attachment_name as string | undefined) ?? null,
      attachment_mime: (body.attachment_mime as string | undefined) ?? null,
      attachment_size: body.attachment_size == null ? null : String(body.attachment_size),
      duration_ms: (body.duration_ms as number | undefined) ?? null,
    }));
    conversation.last_message_at = message.created_at;
    conversation.last_message_preview = message.body?.slice(0, 250) ?? message.attachment_name;
    if (senderRole !== "admin") conversation.unread_admin += 1;
    if (senderRole !== "courier") conversation.unread_courier += 1;
    if (senderRole !== "business") conversation.unread_business += 1;
    await this.conversations.save(conversation);
    return message;
  }

  async markRead(id: string, userId: string, roles: AppRole[]) {
    const conversation = await this.conversations.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    await this.assertConversationAccess(conversation, userId, roles);
    if (roles.includes("admin") || roles.includes("manager")) conversation.unread_admin = 0;
    else if (roles.includes("courier")) conversation.unread_courier = 0;
    else conversation.unread_business = 0;
    await this.conversations.save(conversation);
    return { ok: true as const };
  }

  listNotifications() {
    return this.notifications.find({ order: { created_at: "DESC" } });
  }
  createNotification(userId: string, body: Mutable) {
    const notification = this.notifications.create({ sent_by: userId });
    Object.assign(notification, body, { sent_by: userId });
    return this.notifications.save(notification);
  }
  async updateNotification(id: string, body: Mutable) {
    const notification = await this.notifications.findOne({ where: { id } });
    if (!notification) throw new NotFoundException("Notification not found");
    Object.assign(notification, body, { id });
    return this.notifications.save(notification);
  }
  async deleteNotification(id: string) {
    await this.notifications.delete(id);
    return { ok: true as const };
  }

  async listWithdrawals(userId: string, roles: AppRole[]) {
    if (roles.includes("admin") || roles.includes("manager")) {
      return this.withdrawals.find({ order: { created_at: "DESC" } });
    }
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
    return courier
      ? this.withdrawals.find({ where: { courier_id: courier.id }, order: { created_at: "DESC" } })
      : [];
  }
  async createWithdrawal(userId: string, body: Mutable) {
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
    const courierId = courier?.id ?? (body.courier_id as string | undefined);
    if (!courierId) throw new ForbiddenException("Courier profile required");
    const withdrawal = this.withdrawals.create({
      courier_id: courierId,
      amount: String(body.amount),
    });
    Object.assign(withdrawal, body, {
      courier_id: courierId,
      amount: String(body.amount),
    });
    return this.withdrawals.save(withdrawal);
  }

  listBonuses() { return this.bonuses.find({ order: { sort_order: "ASC", created_at: "DESC" } }); }
  createBonus(userId: string, body: Mutable) {
    const bonus = this.bonuses.create({
      amount: String(body.amount ?? 0),
      created_by: userId,
    });
    Object.assign(bonus, body, {
      amount: String(body.amount ?? 0),
      created_by: userId,
    });
    return this.bonuses.save(bonus);
  }
  async updateBonus(id: string, body: Mutable) {
    const bonus = await this.bonuses.findOne({ where: { id } });
    if (!bonus) throw new NotFoundException("Bonus not found");
    Object.assign(bonus, body, { id });
    if (body.amount != null) bonus.amount = String(body.amount);
    return this.bonuses.save(bonus);
  }
  async deleteBonus(id: string) {
    await this.bonuses.delete(id);
    return { ok: true as const };
  }

  async getMaintenance() {
    return (await this.maintenance.findOne({ where: { id: true } }))
      ?? this.maintenance.save(this.maintenance.create({ id: true, enabled: false, allowlist: [], updated_by: null }));
  }
  async putMaintenance(userId: string, body: Mutable) {
    const current = await this.getMaintenance();
    Object.assign(current, body, { id: true, updated_by: userId });
    return this.maintenance.save(current);
  }

  async createTicket(userId: string, body: Mutable) {
    const previewId = previewCustomerId();
    const customer = previewId
      ? await this.customers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.customers.findOne({ where: { user_id: userId }, select: ["id"] });
    const businessId = customer?.id ?? (body.business_id as string | undefined);
    if (!businessId) throw new ForbiddenException("Business profile required");
    const ticket = this.tickets.create({ business_id: businessId });
    Object.assign(ticket, body, { business_id: businessId });
    return this.tickets.save(ticket);
  }

  /** Seed launch defaults when the table is empty (local/dev or fresh DB). */
  private async ensureDefaultExpressPricing() {
    const count = await this.expressPricing.count();
    if (count > 0) return;
    const defaults: Array<Partial<ExpressPricingRule>> = [
      {
        service_category: "same_day",
        display_name: "משלוח מהיר",
        base_price: "15",
        price_per_km: "5",
        min_price: "15",
        payment_mode: "cash_only",
        deposit_percent: "0",
        allow_customer_fixed_price: true,
        allow_customer_quote: true,
      },
      {
        service_category: "scheduled",
        display_name: "משלוח מתוזמן",
        base_price: "15",
        price_per_km: "5",
        min_price: "15",
        payment_mode: "cash_only",
        deposit_percent: "0",
        allow_customer_fixed_price: true,
        allow_customer_quote: true,
      },
      {
        service_category: "small_move",
        display_name: "הובלה קטנה",
        base_price: "150",
        price_per_km: "8",
        min_price: "150",
        payment_mode: "cash_only",
        deposit_percent: "0",
        allow_customer_fixed_price: true,
        allow_customer_quote: true,
      },
      {
        service_category: "big_move",
        display_name: "הובלת דירה",
        base_price: "800",
        price_per_km: "10",
        min_price: "800",
        payment_mode: "cash_only",
        deposit_percent: "0",
        allow_customer_fixed_price: true,
        allow_customer_quote: true,
      },
    ];
    await this.expressPricing.save(defaults.map((d) => this.expressPricing.create(d)));
  }

  async activeExpressPricing() {
    await this.ensureDefaultExpressPricing();
    const rows = await this.expressPricing.find({
      order: { display_name: "ASC" },
    });
    // Normalize legacy "full" / "cash" modes to the FE enum.
    return rows.map((r) => ({
      ...r,
      payment_mode:
        r.payment_mode === "full"
          ? "full_upfront"
          : r.payment_mode === "cash"
            ? "cash_only"
            : r.payment_mode,
    }));
  }
  listAreas() {
    return this.areas.find({ where: { is_active: true }, order: { name: "ASC" } });
  }

  getCourierStats(courierId: string) {
    return this.courierStats.findOne({ where: { courier_id: courierId } });
  }

  async listCourierOutcomes(courierId: string, limit = 500) {
    const rows = await this.outcomes.find({
      where: { courier_id: courierId },
      order: { delivered_at: "DESC" },
      take: limit,
    });
    const jobIds = [...new Set(rows.map((r) => r.job_id).filter(Boolean))];
    const jobs = jobIds.length
      ? await this.jobs.find({ where: { id: In(jobIds) } })
      : [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    return rows.map((o) => ({
      ...o,
      jobs: jobById.get(o.job_id) ?? null,
    }));
  }

  async listCourierDeclinedOffers(courierId: string, limit = 100) {
    const rows = await this.offerEvents.find({
      where: { courier_id: courierId },
      order: { responded_at: "DESC" },
      take: limit * 2,
    });
    const filtered = rows.filter((r) =>
      ["declined", "expired", "no_response"].includes(r.response),
    ).slice(0, limit);
    const jobIds = [...new Set(filtered.map((r) => r.job_id))];
    const jobs = jobIds.length
      ? await this.jobs.find({ where: { id: In(jobIds) } })
      : [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    return filtered.map((r) => ({ ...r, jobs: jobById.get(r.job_id) ?? null }));
  }

  listActiveBonuses() {
    const now = new Date();
    return this.bonuses
      .find({ where: { is_active: true }, order: { sort_order: "ASC" } })
      .then((rows) =>
        rows.filter((b) => {
          if (b.starts_at && b.starts_at > now) return false;
          if (b.ends_at && b.ends_at < now) return false;
          return true;
        }),
      );
  }

  async courierNotificationUnread(courierId: string) {
    return this.notifications
      .createQueryBuilder("n")
      .where("n.read_at IS NULL")
      .andWhere("(n.courier_id = :courierId OR n.audience = :all)", {
        courierId,
        all: "all",
      })
      .getCount();
  }

  private async requireBusinessId(userId: string) {
    const previewId = previewCustomerId();
    const customer = previewId
      ? await this.customers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.customers.findOne({ where: { user_id: userId }, select: ["id"] });
    if (!customer) throw new ForbiddenException("Business profile required");
    return customer.id;
  }

  listBranches(businessId: string) {
    return this.branches.find({
      where: { business_id: businessId },
      order: { is_default: "DESC", branch_name: "ASC" },
    });
  }

  async saveBranch(businessId: string, body: Mutable, id?: string) {
    if (body.is_default) {
      await this.branches.update({ business_id: businessId }, { is_default: false });
    }
    if (id) {
      const row = await this.branches.findOne({ where: { id, business_id: businessId } });
      if (!row) throw new NotFoundException("Branch not found");
      Object.assign(row, body);
      return this.branches.save(row);
    }
    return this.branches.save(this.branches.create({ ...body, business_id: businessId }));
  }

  async deleteBranch(businessId: string, id: string) {
    await this.branches.delete({ id, business_id: businessId });
    return { ok: true as const };
  }

  async setDefaultBranch(businessId: string, id: string) {
    await this.branches.update({ business_id: businessId }, { is_default: false });
    await this.branches.update({ id, business_id: businessId }, { is_default: true });
    return { ok: true as const };
  }

  async getOrCreateIntegration(businessId: string) {
    let row = await this.integrations.findOne({ where: { business_id: businessId } });
    if (!row) {
      const token = randomUUID().replace(/-/g, "").slice(0, 32);
      const secret = randomUUID().replace(/-/g, "");
      row = await this.integrations.save(
        this.integrations.create({
          business_id: businessId,
          integration_token: token,
          webhook_secret: secret,
        }),
      );
    }
    return row;
  }

  async updateIntegration(businessId: string, body: Mutable) {
    const row = await this.getOrCreateIntegration(businessId);
    Object.assign(row, body);
    return this.integrations.save(row);
  }

  listIntegrationLogs(businessId: string, limit = 20) {
    return this.integrationLogs.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  listBillingRecords(businessId: string, limit = 200) {
    return this.billingRecords.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  listSupportTickets(businessId: string) {
    return this.tickets.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
    });
  }

  getFavorite(businessId: string, courierId: string) {
    return this.favorites.findOne({ where: { business_id: businessId, courier_id: courierId } });
  }

  async setFavorite(businessId: string, courierId: string, status: string | null) {
    if (!status) {
      await this.favorites.delete({ business_id: businessId, courier_id: courierId });
      return { ok: true as const };
    }
    const existing = await this.favorites.findOne({
      where: { business_id: businessId, courier_id: courierId },
    });
    const row = existing ?? this.favorites.create({ business_id: businessId, courier_id: courierId });
    row.status = status;
    return this.favorites.save(row);
  }

  async listCustomerJobs(customerId: string, limit = 500) {
    return this.jobs.find({
      where: { customer_id: customerId },
      order: { created_at: "DESC" },
      take: limit,
    });
  }

  async requireBusinessUser(userId: string) {
    return this.requireBusinessId(userId);
  }

  private async requireCourierId(userId: string) {
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
    if (!courier) throw new ForbiddenException("Courier profile required");
    return courier.id;
  }

  async myCourierStats(userId: string) {
    const courierId = await this.requireCourierId(userId);
    return this.getCourierStats(courierId);
  }

  async myCourierOutcomes(userId: string) {
    const courierId = await this.requireCourierId(userId);
    return this.listCourierOutcomes(courierId);
  }

  async myDeclinedOffers(userId: string) {
    const courierId = await this.requireCourierId(userId);
    return this.listCourierDeclinedOffers(courierId);
  }

  async myNotificationUnread(userId: string) {
    const courierId = await this.requireCourierId(userId);
    return this.courierNotificationUnread(courierId);
  }

  async branchesForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.listBranches(businessId);
  }

  async createBranchForUser(userId: string, body: Mutable) {
    const businessId = await this.requireBusinessId(userId);
    return this.saveBranch(businessId, body);
  }

  async updateBranchForUser(userId: string, id: string, body: Mutable) {
    const businessId = await this.requireBusinessId(userId);
    return this.saveBranch(businessId, body, id);
  }

  async deleteBranchForUser(userId: string, id: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.deleteBranch(businessId, id);
  }

  async setDefaultBranchForUser(userId: string, id: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.setDefaultBranch(businessId, id);
  }

  async integrationForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.getOrCreateIntegration(businessId);
  }

  async patchIntegrationForUser(userId: string, body: Mutable) {
    const businessId = await this.requireBusinessId(userId);
    return this.updateIntegration(businessId, body);
  }

  async integrationLogsForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.listIntegrationLogs(businessId);
  }

  async billingForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.listBillingRecords(businessId);
  }

  async ticketsForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.listSupportTickets(businessId);
  }

  async favoriteForUser(userId: string, courierId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.getFavorite(businessId, courierId);
  }

  async setFavoriteForUser(userId: string, courierId: string, status: string | null) {
    const businessId = await this.requireBusinessId(userId);
    return this.setFavorite(businessId, courierId, status);
  }
}
