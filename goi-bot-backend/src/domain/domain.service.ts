import { randomUUID } from "crypto";
import {
  BadRequestException,
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
import { RecurringOrder } from "../accounts/entities/recurring-order.entity";
import { ReferralCommission } from "../accounts/entities/referral-commission.entity";
import { SavedContact } from "../accounts/entities/saved-contact.entity";
import { TeamMember } from "../accounts/entities/team-member.entity";
import { previewCourierId, previewCustomerId } from "../auth/auth-als";
import type { AppRole } from "../auth/auth.types";
import { Message } from "../chat/entities/message.entity";
import { ExpressPricingRule } from "../jobs/entities/express-pricing-rule.entity";
import { JobOutcome } from "../jobs/entities/job-outcome.entity";
import { StatusLog } from "../jobs/entities/status-log.entity";
import { Area } from "../platform/entities/area.entity";
import { ClassificationRule } from "../platform/entities/classification-rule.entity";
import { CourierTag } from "../platform/entities/courier-tag.entity";
import { Tag } from "../platform/entities/tag.entity";
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

const ISRAEL_TZ = "Asia/Jerusalem";
const MIN_COURIER_WITHDRAWAL = 400;

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
    @InjectRepository(Tag) private readonly tags: Repository<Tag>,
    @InjectRepository(CourierTag) private readonly courierTags: Repository<CourierTag>,
    @InjectRepository(ClassificationRule)
    private readonly classificationRules: Repository<ClassificationRule>,
    @InjectRepository(SavedContact) private readonly savedContacts: Repository<SavedContact>,
    @InjectRepository(TeamMember) private readonly teamMembers: Repository<TeamMember>,
    @InjectRepository(RecurringOrder) private readonly recurringOrders: Repository<RecurringOrder>,
    @InjectRepository(ReferralCommission)
    private readonly referralCommissions: Repository<ReferralCommission>,
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
        where: { courier_id: ids.courierId, hidden_from_participants: false },
        order: { last_message_at: "DESC" },
      });
    }
    if ((roles.includes("business") || roles.includes("customer")) && ids.businessId) {
      return this.conversations.find({
        where: { business_id: ids.businessId, hidden_from_participants: false },
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
    const isStaff = roles.includes("admin") || roles.includes("manager");
    let conversation: Conversation | null = null;
    if (kind === "courier_business" && jobId) {
      conversation = await this.conversations.findOne({
        where: { kind: "courier_business", job_id: jobId },
      });
    } else {
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
      conversation = await query.getOne();
    }
    if (!conversation) {
      if (kind === "courier_business" && jobId && !isStaff) {
        const job = await this.jobs.findOne({
          where: { id: jobId },
          select: ["id", "status"],
        });
        if (!job || ["הושלמה", "בוטלה"].includes(job.status)) {
          throw new ForbiddenException("השיחה הסתיימה עם מסירת המשלוח");
        }
      }
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
          unread_guest: 0,
          hidden_from_participants: false,
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
    if (
      conversation.hidden_from_participants &&
      conversation.kind === "courier_business" &&
      senderRole !== "admin"
    ) {
      throw new ForbiddenException("השיחה הסתיימה עם מסירת המשלוח");
    }
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
    if (conversation.kind === "guest_support") {
      // Admin reply → guest unread; guest messages are posted via public API.
      if (senderRole === "admin") conversation.unread_guest += 1;
      else conversation.unread_admin += 1;
    } else {
      if (senderRole !== "admin") conversation.unread_admin += 1;
      if (senderRole !== "courier") conversation.unread_courier += 1;
      if (senderRole !== "business") conversation.unread_business += 1;
    }
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

  private async attachCouriersToWithdrawals(rows: WithdrawalRequest[]) {
    const ids = [...new Set(rows.map((r) => r.courier_id).filter(Boolean))];
    const couriers = ids.length
      ? await this.couriers.find({
          where: { id: In(ids) },
          select: ["id", "full_name", "whatsapp_phone"],
        })
      : [];
    const byId = new Map(couriers.map((c) => [c.id, c]));
    return rows.map((r) => ({
      ...r,
      couriers: byId.get(r.courier_id)
        ? {
            full_name: byId.get(r.courier_id)!.full_name,
            whatsapp_phone: byId.get(r.courier_id)!.whatsapp_phone,
          }
        : null,
    }));
  }

  async listWithdrawals(userId: string, roles: AppRole[]) {
    if (roles.includes("admin") || roles.includes("manager")) {
      const rows = await this.withdrawals.find({ order: { created_at: "DESC" } });
      return this.attachCouriersToWithdrawals(rows);
    }
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
    if (!courier) return [];
    const rows = await this.withdrawals.find({
      where: { courier_id: courier.id },
      order: { created_at: "DESC" },
    });
    return this.attachCouriersToWithdrawals(rows);
  }
  async withdrawableBalanceForCourier(courierId: string) {
    const earnedRow = await this.outcomes
      .createQueryBuilder("o")
      .innerJoin(Job, "j", "j.id = o.job_id")
      .select("COALESCE(SUM(COALESCE(j.payment, 0) + COALESCE(o.tip_amount, 0)), 0)", "earned")
      .where("o.courier_id = :courierId", { courierId })
      .andWhere("o.delivered_at IS NOT NULL")
      .andWhere("COALESCE(o.was_cancelled, false) = false")
      .andWhere(
        `(EXTRACT(YEAR FROM (o.delivered_at AT TIME ZONE '${ISRAEL_TZ}'))::int * 12
          + EXTRACT(MONTH FROM (o.delivered_at AT TIME ZONE '${ISRAEL_TZ}'))::int)
         < (EXTRACT(YEAR FROM (NOW() AT TIME ZONE '${ISRAEL_TZ}'))::int * 12
          + EXTRACT(MONTH FROM (NOW() AT TIME ZONE '${ISRAEL_TZ}'))::int)`,
      )
      .getRawOne<{ earned: string | number }>();
    const earned = Number(earnedRow?.earned ?? 0);
    const commissionRow = await this.referralCommissions
      .createQueryBuilder("c")
      .select("COALESCE(SUM(c.amount), 0)", "earned")
      .where("c.beneficiary_courier_id = :courierId", { courierId })
      .andWhere(
        `(EXTRACT(YEAR FROM (c.created_at AT TIME ZONE '${ISRAEL_TZ}'))::int * 12
          + EXTRACT(MONTH FROM (c.created_at AT TIME ZONE '${ISRAEL_TZ}'))::int)
         < (EXTRACT(YEAR FROM (NOW() AT TIME ZONE '${ISRAEL_TZ}'))::int * 12
          + EXTRACT(MONTH FROM (NOW() AT TIME ZONE '${ISRAEL_TZ}'))::int)`,
      )
      .getRawOne<{ earned: string | number }>();
    const commissions = Number(commissionRow?.earned ?? 0);
    const rows = await this.withdrawals.find({ where: { courier_id: courierId } });
    const paidOut = rows
      .filter((w) => w.status === "שולמה")
      .reduce((sum, w) => sum + Number(w.amount ?? 0), 0);
    const reserved = rows
      .filter((w) => w.status !== "נדחתה" && w.status !== "שולמה")
      .reduce((sum, w) => sum + Number(w.amount ?? 0), 0);
    return Math.max(0, earned + commissions - paidOut - reserved);
  }

  async createWithdrawal(userId: string, body: Mutable, roles: AppRole[] = []) {
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
      : await this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
    const courierId = courier?.id ?? (body.courier_id as string | undefined);
    if (!courierId) throw new ForbiddenException("Courier profile required");
    const isStaff = roles.includes("admin") || roles.includes("manager");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("סכום משיכה לא תקין");
    }
    if (!isStaff) {
      if (amount < MIN_COURIER_WITHDRAWAL) {
        throw new BadRequestException(`הסכום המינימלי למשיכה הוא ₪${MIN_COURIER_WITHDRAWAL}`);
      }
      const existing = await this.withdrawals.find({ where: { courier_id: courierId } });
      const hasPending = existing.some((w) => w.status !== "נדחתה" && w.status !== "שולמה");
      if (hasPending) {
        throw new BadRequestException("יש כבר בקשת משיכה ממתינה");
      }
      const available = await this.withdrawableBalanceForCourier(courierId);
      if (Math.round(amount * 100) > Math.round(available * 100)) {
        throw new BadRequestException(
          available <= 0
            ? "ניתן למשוך רק משלוחים מחודשים קודמים, החל מה-1 לחודש"
            : "הסכום גבוה מהיתרה הזמינה",
        );
      }
    }
    const withdrawal = this.withdrawals.create({
      courier_id: courierId,
      amount: String(body.amount),
      status: "ממתינה",
    });
    Object.assign(withdrawal, body, {
      courier_id: courierId,
      amount: String(body.amount),
      status: "ממתינה",
    });
    return this.withdrawals.save(withdrawal);
  }

  async updateWithdrawal(id: string, actorUserId: string, body: Mutable, roles: AppRole[] = []) {
    const row = await this.withdrawals.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Withdrawal not found");
    const isAdmin = roles.includes("admin") || roles.includes("manager");
    if (!isAdmin) {
      const previewId = previewCourierId();
      const courier = previewId
        ? await this.couriers.findOne({ where: { id: previewId }, select: ["id"] })
        : await this.couriers.findOne({ where: { user_id: actorUserId }, select: ["id"] });
      if (!courier || row.courier_id !== courier.id) {
        throw new ForbiddenException("Withdrawal not found");
      }
      if (row.status === "שולמה" || row.status === "נדחתה") {
        throw new BadRequestException("Cannot attach invoice to this withdrawal");
      }
      if (body.receipt_url == null) {
        throw new BadRequestException("receipt_url is required");
      }
      row.receipt_url = String(body.receipt_url);
      return this.withdrawals.save(row);
    }
    const status = String(body.status || "").trim();
    const allowed = ["ממתינה", "אושרה", "שולמה", "נדחתה"];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`status must be one of: ${allowed.join(", ")}`);
    }
    row.status = status;
    if (status === "אושרה") {
      row.approved_by = actorUserId;
      row.approved_at = new Date();
      row.rejection_reason = null;
    }
    if (status === "נדחתה") {
      row.rejection_reason = (body.reason as string | undefined) ?? null;
      row.approved_by = actorUserId;
      row.approved_at = new Date();
    }
    if (status === "שולמה") {
      row.paid_at = new Date();
      if (!row.approved_at) {
        row.approved_by = actorUserId;
        row.approved_at = new Date();
      }
      if (body.reference_number != null) row.reference_number = String(body.reference_number);
    }
    if (body.receipt_url != null) row.receipt_url = String(body.receipt_url);
    return this.withdrawals.save(row);
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

  async createArea(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("name is required");
    const existing = await this.areas.findOne({ where: { name: trimmed } });
    if (existing) {
      if (!existing.is_active) {
        existing.is_active = true;
        return this.areas.save(existing);
      }
      return existing;
    }
    return this.areas.save(this.areas.create({ name: trimmed, is_active: true }));
  }

  async deleteArea(id: string) {
    const row = await this.areas.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Area not found");
    row.is_active = false;
    await this.areas.save(row);
    return { ok: true as const };
  }

  async updateExpressPricingRule(id: string, body: Mutable) {
    const row = await this.expressPricing.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Express pricing rule not found");
    const numericKeys = ["base_price", "price_per_km", "min_price", "deposit_percent"] as const;
    for (const key of numericKeys) {
      if (body[key] != null) row[key] = String(body[key]);
    }
    if (body.display_name != null) row.display_name = String(body.display_name);
    if (body.payment_mode != null) row.payment_mode = String(body.payment_mode);
    if (body.allow_customer_fixed_price != null) {
      row.allow_customer_fixed_price = Boolean(body.allow_customer_fixed_price);
    }
    if (body.allow_customer_quote != null) {
      row.allow_customer_quote = Boolean(body.allow_customer_quote);
    }
    if (body.notes !== undefined) {
      row.notes = body.notes == null ? null : String(body.notes);
    }
    return this.expressPricing.save(row);
  }

  listTags() {
    return this.tags.find({ order: { name: "ASC" } });
  }

  async createTag(name: string, color?: string | null) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("name is required");
    return this.tags.save(this.tags.create({ name: trimmed, color: color ?? null }));
  }

  async deleteTag(id: string) {
    await this.courierTags.delete({ tag_id: id });
    await this.classificationRules.delete({ tag_id: id });
    await this.tags.delete(id);
    return { ok: true as const };
  }

  async listClassificationRules() {
    const rules = await this.classificationRules.find({ order: { created_at: "ASC" } });
    const tagIds = [...new Set(rules.map((r) => r.tag_id))];
    const tags = tagIds.length
      ? await this.tags.find({ where: { id: In(tagIds) } })
      : [];
    const byId = new Map(tags.map((t) => [t.id, t]));
    return rules.map((r) => ({
      ...r,
      tags: byId.get(r.tag_id) ? { name: byId.get(r.tag_id)!.name } : null,
    }));
  }

  async updateClassificationRule(id: string, body: Mutable) {
    const row = await this.classificationRules.findOne({ where: { id } });
    if (!row) throw new NotFoundException("Classification rule not found");
    if (body.enabled != null) row.enabled = Boolean(body.enabled);
    if (body.description != null) row.description = String(body.description);
    if (body.field != null) row.field = String(body.field);
    if (body.operator != null) row.operator = String(body.operator);
    if (body.value != null) row.value = String(body.value);
    if (body.tag_id != null) row.tag_id = String(body.tag_id);
    return this.classificationRules.save(row);
  }

  async listCourierTags(courierId: string) {
    const rows = await this.courierTags.find({
      where: { courier_id: courierId },
      order: { created_at: "DESC" },
    });
    const tagIds = rows.map((r) => r.tag_id);
    const tags = tagIds.length
      ? await this.tags.find({ where: { id: In(tagIds) } })
      : [];
    const byId = new Map(tags.map((t) => [t.id, t]));
    return rows.map((r) => ({
      ...r,
      tags: byId.get(r.tag_id) ? { name: byId.get(r.tag_id)!.name } : null,
    }));
  }

  async addCourierTag(courierId: string, tagId: string, assignedAutomatically = false) {
    const tag = await this.tags.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException("Tag not found");
    const existing = await this.courierTags.findOne({
      where: { courier_id: courierId, tag_id: tagId },
    });
    if (existing) return existing;
    return this.courierTags.save(
      this.courierTags.create({
        courier_id: courierId,
        tag_id: tagId,
        assigned_automatically: assignedAutomatically,
      }),
    );
  }

  async removeCourierTag(courierId: string, tagId: string) {
    await this.courierTags.delete({ courier_id: courierId, tag_id: tagId });
    return { ok: true as const };
  }

  listSavedContacts(businessId: string) {
    return this.savedContacts.find({
      where: { business_id: businessId },
      order: { contact_name: "ASC" },
    });
  }

  async upsertSavedContact(businessId: string, body: Mutable) {
    const id = body.id as string | undefined;
    if (id) {
      const row = await this.savedContacts.findOne({ where: { id, business_id: businessId } });
      if (!row) throw new NotFoundException("Contact not found");
      Object.assign(row, {
        contact_name: body.contact_name ?? row.contact_name,
        phone: body.phone ?? row.phone,
        city: body.city ?? row.city,
        full_address: body.full_address ?? row.full_address,
        notes: body.notes ?? row.notes,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : row.tags,
      });
      return this.savedContacts.save(row);
    }
    return this.savedContacts.save(
      this.savedContacts.create({
        business_id: businessId,
        contact_name: String(body.contact_name || ""),
        phone: (body.phone as string | null) ?? null,
        city: (body.city as string | null) ?? null,
        full_address: (body.full_address as string | null) ?? null,
        notes: (body.notes as string | null) ?? null,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      }),
    );
  }

  async deleteSavedContact(businessId: string, id: string) {
    await this.savedContacts.delete({ id, business_id: businessId });
    return { ok: true as const };
  }

  listTeamMembers(businessId: string) {
    return this.teamMembers.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
    });
  }

  inviteTeamMember(businessId: string, body: Mutable) {
    return this.teamMembers.save(
      this.teamMembers.create({
        business_id: businessId,
        name: String(body.name || ""),
        phone: (body.phone as string | null) ?? null,
        role: String(body.role || "viewer"),
        invited_at: new Date(),
        accepted_at: null,
      }),
    );
  }

  async updateTeamMemberRole(businessId: string, id: string, role: string) {
    const row = await this.teamMembers.findOne({ where: { id, business_id: businessId } });
    if (!row) throw new NotFoundException("Team member not found");
    row.role = role;
    return this.teamMembers.save(row);
  }

  async deleteTeamMember(businessId: string, id: string) {
    await this.teamMembers.delete({ id, business_id: businessId });
    return { ok: true as const };
  }

  listRecurringOrders(businessId: string) {
    return this.recurringOrders.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
    });
  }

  async saveRecurringOrder(businessId: string, body: Mutable, id?: string) {
    if (id) {
      const row = await this.recurringOrders.findOne({ where: { id, business_id: businessId } });
      if (!row) throw new NotFoundException("Recurring order not found");
      Object.assign(row, body, { business_id: businessId, id });
      if (body.payment != null) row.payment = String(body.payment);
      if (body.active != null) row.active = Boolean(body.active);
      if (body.couriers_needed != null) row.couriers_needed = Number(body.couriers_needed);
      if (Array.isArray(body.days_of_week)) row.days_of_week = body.days_of_week.map(Number);
      return this.recurringOrders.save(row);
    }
    return this.recurringOrders.save(
      this.recurringOrders.create({
        business_id: businessId,
        recurrence_type: String(body.recurrence_type || "weekly"),
        days_of_week: Array.isArray(body.days_of_week) ? body.days_of_week.map(Number) : [],
        start_time: (body.start_time as string | null) ?? null,
        end_time: (body.end_time as string | null) ?? null,
        pickup_address: (body.pickup_address as string | null) ?? null,
        dropoff_address: (body.dropoff_address as string | null) ?? null,
        payment: body.payment != null ? String(body.payment) : null,
        couriers_needed: Number(body.couriers_needed ?? 1),
        active: body.active != null ? Boolean(body.active) : true,
        notes: (body.notes as string | null) ?? null,
      }),
    );
  }

  async deleteRecurringOrder(businessId: string, id: string) {
    await this.recurringOrders.delete({ id, business_id: businessId });
    return { ok: true as const };
  }

  async toggleRecurringOrder(businessId: string, id: string, active: boolean) {
    const row = await this.recurringOrders.findOne({ where: { id, business_id: businessId } });
    if (!row) throw new NotFoundException("Recurring order not found");
    row.active = active;
    return this.recurringOrders.save(row);
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

  async listCourierNotifications(courierId: string) {
    return this.notifications
      .createQueryBuilder("n")
      .where("(n.courier_id = :courierId OR n.audience = :all)", {
        courierId,
        all: "all",
      })
      .orderBy("n.created_at", "DESC")
      .limit(100)
      .getMany();
  }

  async markCourierNotificationRead(courierId: string, notificationId: string) {
    const notification = await this.notifications.findOne({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    if (
      notification.audience !== "all" &&
      notification.courier_id !== courierId
    ) {
      throw new NotFoundException("Notification not found");
    }
    notification.read_at = new Date();
    await this.notifications.save(notification);
    return { ok: true as const };
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

  async listFavorites(businessId: string) {
    const rows = await this.favorites.find({
      where: { business_id: businessId },
      order: { created_at: "DESC" },
    });
    const ids = [...new Set(rows.map((r) => r.courier_id))];
    const couriers = ids.length
      ? await this.couriers.find({
          where: { id: In(ids) },
          select: ["id", "full_name", "whatsapp_phone", "vehicle_label", "vehicle_type", "base_city", "avatar_url"],
        })
      : [];
    const byId = new Map(couriers.map((c) => [c.id, c]));
    return rows.map((r) => ({
      ...r,
      couriers: byId.get(r.courier_id)
        ? {
            full_name: byId.get(r.courier_id)!.full_name,
            whatsapp_phone: byId.get(r.courier_id)!.whatsapp_phone,
            vehicle_label: byId.get(r.courier_id)!.vehicle_label,
            vehicle_type: byId.get(r.courier_id)!.vehicle_type,
            base_city: byId.get(r.courier_id)!.base_city,
            avatar_url: byId.get(r.courier_id)!.avatar_url,
          }
        : null,
    }));
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

  async favoritesForUser(userId: string) {
    const businessId = await this.requireBusinessId(userId);
    return this.listFavorites(businessId);
  }

  async setFavoriteForUser(userId: string, courierId: string, status: string | null) {
    const businessId = await this.requireBusinessId(userId);
    return this.setFavorite(businessId, courierId, status);
  }
}
