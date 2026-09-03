import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { In, IsNull, MoreThanOrEqual, Not, Repository } from "typeorm";
import { ReferralCommissionsService } from "../accounts/referral-commissions.service";
import { BusinessNotification } from "../accounts/entities/business-notification.entity";
import { Courier } from "../accounts/entities/courier.entity";
import { CourierStats } from "../accounts/entities/courier-stats.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { previewCourierId, previewCustomerId } from "../auth/auth-als";
import type { AppRole } from "../auth/auth.types";
import { Conversation } from "../push/entities/conversation.entity";
import { OfferPushService } from "../push/offer-push.service";
import { WhatsappDispatchService } from "../whatsapp/whatsapp-dispatch.service";
import { GreenApiClient } from "../whatsapp/green-api.client";
import { CourierJobDecline } from "./entities/courier-job-decline.entity";
import { Job } from "./entities/job.entity";
import { JobQuote } from "./entities/job-quote.entity";
import { OfferEvent } from "./entities/offer-event.entity";
import type { CreateJobDto } from "./dto/create-job.dto";
import type { CreateQuoteDto } from "./dto/create-quote.dto";
import type { UpdateJobDto } from "./dto/update-job.dto";
import { JobOutcome } from "./entities/job-outcome.entity";
import { JobStop } from "./entities/job-stop.entity";
import { StatusLog } from "./entities/status-log.entity";
import { generateJobShortCode } from "./job-short-code";
import {
  isWithinScheduledGoOnlineWindow,
} from "./job-schedule";
import {
  CLAIMABLE_STATUSES,
  OPEN_STATUSES,
  isClaimableStatus as statusIsClaimable,
} from "./job-statuses";

function generateTrackingToken(): string {
  return randomBytes(16).toString("hex");
}

const OFFER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private scheduledGoOnlineTimer?: ReturnType<typeof setInterval>;
  private scheduledGoOnlineRunning = false;

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(JobQuote) private readonly quotes: Repository<JobQuote>,
    @InjectRepository(OfferEvent) private readonly offers: Repository<OfferEvent>,
    @InjectRepository(CourierJobDecline)
    private readonly declines: Repository<CourierJobDecline>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Courier) private readonly couriers: Repository<Courier>,
    @InjectRepository(JobOutcome) private readonly outcomes: Repository<JobOutcome>,
    @InjectRepository(JobStop) private readonly jobStops: Repository<JobStop>,
    @InjectRepository(StatusLog) private readonly statusLogs: Repository<StatusLog>,
    @InjectRepository(CourierStats) private readonly courierStats: Repository<CourierStats>,
    @InjectRepository(BusinessNotification)
    private readonly businessNotifications: Repository<BusinessNotification>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    private readonly whatsappDispatch: WhatsappDispatchService,
    private readonly greenApi: GreenApiClient,
    private readonly offerPush: OfferPushService,
    private readonly referralCommissions: ReferralCommissionsService,
  ) {}

  onModuleInit() {
    void this.jobs.query(
      `ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_online_notified_at timestamptz`,
    );
    this.scheduledGoOnlineTimer = setInterval(() => {
      void this.activateCouriersForUpcomingScheduledJobs();
    }, 60_000);
    setTimeout(() => {
      void this.activateCouriersForUpcomingScheduledJobs();
    }, 8_000);
  }

  onModuleDestroy() {
    if (this.scheduledGoOnlineTimer) clearInterval(this.scheduledGoOnlineTimer);
  }

  /**
   * Rank eligible couriers for admin matching UI (does not create offers).
   */
  async matchCouriers(jobId: string, limit = 15) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");

    const eligible = await this.couriers.find({
      where: {
        courier_status: "פעיל",
        accepting_jobs: true,
        is_paused: false,
        admin_jobs_blocked: false,
      },
      take: 500,
    });
    const statsRows = await this.courierStats.find({
      where: { courier_id: In(eligible.map((c) => c.id)) },
    });
    const statsById = new Map(statsRows.map((s) => [s.courier_id, s]));

    const vehicleNeeded = (job.vehicle_required || "").trim();
    const pickup = (job.pickup_area || "").trim();
    const dropoff = (job.dropoff_area || "").trim();
    const jobType = (job.job_type || "").trim();

    type Reason = { label: string; points: number };
    const matches = eligible.map((c) => {
      const stats = statsById.get(c.id);
      const reasons: Reason[] = [];
      let score = 40;
      reasons.push({ label: "שליח פעיל", points: 40 });

      const vehicles = [
        c.vehicle_type,
        c.vehicle_label,
        ...(c.vehicle_types || []),
      ]
        .filter(Boolean)
        .map(String);
      if (vehicleNeeded && vehicles.some((v) => v.includes(vehicleNeeded) || vehicleNeeded.includes(v))) {
        score += 20;
        reasons.push({ label: "התאמת רכב", points: 20 });
      } else if (!vehicleNeeded) {
        score += 5;
        reasons.push({ label: "ללא דרישת רכב", points: 5 });
      }

      const areas = [
        ...(c.working_areas || []),
        ...(c.pickup_areas || []),
        ...(c.dropoff_areas || []),
        c.base_city,
      ]
        .filter(Boolean)
        .map(String);
      const nationwide = areas.some((a) => a.includes("כל הארץ"));
      if (nationwide || (pickup && areas.some((a) => a.includes(pickup) || pickup.includes(a)))) {
        score += 15;
        reasons.push({ label: "אזור איסוף", points: 15 });
      }
      if (dropoff && areas.some((a) => a.includes(dropoff) || dropoff.includes(a))) {
        score += 10;
        reasons.push({ label: "אזור מסירה", points: 10 });
      }
      if (jobType && (c.job_types || []).includes(jobType)) {
        score += 10;
        reasons.push({ label: "סוג עבודה", points: 10 });
      }

      const acceptance = stats?.acceptance_rate != null ? Number(stats.acceptance_rate) : null;
      const onTime = stats?.on_time_rate != null ? Number(stats.on_time_rate) : null;
      const rating = stats?.avg_rating != null ? Number(stats.avg_rating) : null;
      const completed = stats?.jobs_completed ?? 0;

      if (acceptance != null && !Number.isNaN(acceptance)) {
        const pts = Math.round(Math.min(1, Math.max(0, acceptance)) * 10);
        if (pts > 0) {
          score += pts;
          reasons.push({ label: "שיעור קבלה", points: pts });
        }
      }
      if (onTime != null && !Number.isNaN(onTime)) {
        const pts = Math.round(Math.min(1, Math.max(0, onTime)) * 10);
        if (pts > 0) {
          score += pts;
          reasons.push({ label: "עמידה בזמנים", points: pts });
        }
      }
      if (rating != null && !Number.isNaN(rating)) {
        const pts = Math.round((Math.min(5, Math.max(0, rating)) / 5) * 8);
        if (pts > 0) {
          score += pts;
          reasons.push({ label: "דירוג ממוצע", points: pts });
        }
      }
      if (completed >= 10) {
        score += 5;
        reasons.push({ label: "ניסיון מוכח", points: 5 });
      }

      return {
        courier_id: c.id,
        full_name: c.full_name,
        whatsapp_phone: c.whatsapp_phone,
        vehicle_label: c.vehicle_label || c.vehicle_type,
        base_city: c.base_city,
        score,
        acceptance_rate: acceptance,
        on_time_rate: onTime,
        avg_rating: rating,
        jobs_completed: completed,
        reasons,
      };
    });

    matches.sort((a, b) => b.score - a.score);
    return { matches: matches.slice(0, Math.max(1, Math.min(50, limit))) };
  }

  /**
   * Open a job to couriers: Hebrew open status + offer_events fan-out,
   * then best-effort WhatsApp group + Web Push notifications.
   * Inbox visibility never depends on external channel success.
   */
  /**
   * Create→dispatch contract (courier inbox visibility):
   * 1. Create job with Hebrew open status (or leave default — dispatch normalizes).
   * 2. Call POST /api/jobs/:id/dispatch for any send-to-couriers flow
   *    (skip only true quote_request waiting-for-bids product paths).
   * 3. Dispatch sets status=`נשלחה לשליחים`, creates offer_events, fan-out push/WhatsApp.
   * Without step 2 the job stays invisible/incomplete in courier `/courier/new-jobs`.
   */
  async dispatchJob(jobId: string) {
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.status === "בוטלה" || job.status === "הושלמה") {
      throw new ForbiddenException("Cannot dispatch a closed job");
    }
    if (job.selected_courier_id) {
      return { ok: true as const, dispatched: true, sent: 0, already_assigned: true };
    }

    const previousStatus = job.status;
    // Canonical Hebrew open status for courier inbox / claim WHERE
    job.status = "נשלחה לשליחים";
    if (job.pricing_type === "quote_request" && !job.quote_deadline_at) {
      job.quote_deadline_at = new Date(Date.now() + OFFER_TTL_MS);
    }

    const eligible = await this.couriers.find({
      where: {
        courier_status: "פעיל",
        accepting_jobs: true,
        is_paused: false,
        admin_jobs_blocked: false,
      },
      select: ["id"],
      take: 500,
    });

    const existing = await this.offers.find({
      where: { job_id: jobId },
      select: ["courier_id"],
    });
    const already = new Set(existing.map((o) => o.courier_id));
    const now = new Date();
    const expires = new Date(now.getTime() + OFFER_TTL_MS);
    const toCreate = eligible
      .filter((c) => !already.has(c.id))
      .map((c) =>
        this.offers.create({
          job_id: jobId,
          courier_id: c.id,
          channel: "app",
          response: "pending",
          sent_at: now,
          expires_at: expires,
          metadata: { source: "dispatch" },
        }),
      );

    if (toCreate.length) {
      await this.offers.save(toCreate);
    }

    job.matching_couriers_count = already.size + toCreate.length;
    await this.jobs.save(job);

    await this.statusLogs.save(
      this.statusLogs.create({
        entity_type: "job",
        entity_id: jobId,
        old_status: previousStatus,
        new_status: "נשלחה לשליחים",
        note: `dispatched to ${job.matching_couriers_count} couriers`,
      }),
    );

    // External channels: fail soft. `sent` remains offer-row count only.
    const notifyCourierIds = [
      ...new Set([
        ...eligible.map((c) => c.id),
        ...existing.map((o) => o.courier_id),
      ]),
    ];
    const [whatsapp, push] = await Promise.all([
      this.whatsappDispatch.notifyJobDispatched(job).catch((e) => {
        this.logger.error(
          `dispatchJob ${jobId} whatsapp fan-out threw`,
          e instanceof Error ? e.stack : e,
        );
        return { ok: false as const, skipped: "error" };
      }),
      this.offerPush.notifyCouriers(job, notifyCourierIds).catch((e) => {
        this.logger.error(
          `dispatchJob ${jobId} push fan-out threw`,
          e instanceof Error ? e.stack : e,
        );
        return { sent: 0, failed: 0, skipped: "error" };
      }),
    ]);

    this.logger.log(
      `dispatchJob ${jobId}: status=נשלחה לשליחים offers=${toCreate.length} ` +
        `whatsapp=${whatsapp.ok ? "ok" : whatsapp.skipped ?? "fail"} ` +
        `push_sent=${push.sent} push_failed=${push.failed}` +
        (push.skipped ? ` push_skip=${push.skipped}` : ""),
    );

    return {
      ok: true as const,
      dispatched: true,
      sent: toCreate.length,
      matching_couriers_count: job.matching_couriers_count,
      notifications: {
        whatsapp_ok: whatsapp.ok,
        push_sent: push.sent,
        push_failed: push.failed,
      },
    };
  }

  async cancelPendingOffersForJob(jobId: string) {
    await this.offers
      .createQueryBuilder()
      .update(OfferEvent)
      .set({ response: "cancelled", responded_at: new Date() })
      .where("job_id = :jobId AND response = :pending", {
        jobId,
        pending: "pending",
      })
      .execute();
  }

  async listForUser(
    userId: string,
    roles: AppRole[],
    status?: string,
    limit = 100,
  ) {
    if (roles.includes("admin") || roles.includes("manager")) {
      return this.attachCouriers(
        await this.jobs.find({
          where: status ? { status } : {},
          order: { created_at: "DESC" },
          take: limit,
        }),
      );
    }

    if (roles.includes("business") || roles.includes("customer")) {
      const customer = await this.findCustomerForUser(userId);
      if (!customer) return [];
      return this.attachCouriers(
        await this.jobs.find({
          where: status
            ? { customer_id: customer.id, status }
            : { customer_id: customer.id },
          order: { created_at: "DESC" },
          take: limit,
        }),
      );
    }

    if (roles.includes("courier")) {
      const courier = await this.findCourierForUser(userId);
      if (!courier) return [];
      const assigned = await this.jobs.find({
        where: { selected_courier_id: courier.id },
        order: { created_at: "DESC" },
        take: limit,
      });
      const open = await this.jobs.find({
        where: { status: In(OPEN_STATUSES) },
        order: { created_at: "DESC" },
        take: limit,
      });
      const byId = new Map<string, Job>();
      for (const j of [...assigned, ...open]) byId.set(j.id, j);
      return this.attachCouriers([...byId.values()].slice(0, limit));
    }

    return [];
  }

  async getForUser(id: string, userId: string, roles: AppRole[]) {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");
    await this.assertCanRead(job, userId, roles);
    return job;
  }

  async getForUserWithCourier(id: string, userId: string, roles: AppRole[]) {
    const job = await this.getForUser(id, userId, roles);
    const [withCourier] = await this.attachCouriers([job]);
    const [withChat] = await this.attachJobChatMeta([withCourier]);
    return withChat;
  }

  async create(userId: string, roles: AppRole[], dto: CreateJobDto) {
    if (
      !roles.includes("admin") &&
      !roles.includes("manager") &&
      !roles.includes("business") &&
      !roles.includes("customer")
    ) {
      throw new ForbiddenException("Cannot create jobs");
    }

    let customerId = dto.customer_id ?? null;
    if (!customerId && (roles.includes("business") || roles.includes("customer"))) {
      const customer = await this.findCustomerForUser(userId);
      customerId = customer?.id ?? null;
      if (!dto.customer_name && customer?.name) {
        dto.customer_name = customer.name;
      }
    }

    const jobNumber =
      dto.job_number ??
      `J-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const toNumeric = (value: number | null | undefined): string | null =>
      value == null ? null : String(value);

    const pricingSnapshot: Record<string, unknown> = {};
    if (dto.package_type != null) pricingSnapshot.package_type = dto.package_type;
    if (dto.delivery_deadline != null) pricingSnapshot.delivery_deadline = dto.delivery_deadline;
    if (dto.base_price != null) pricingSnapshot.base_price = dto.base_price;
    if (dto.price_per_km != null) pricingSnapshot.price_per_km = dto.price_per_km;

    let shortCode = generateJobShortCode();
    for (let attempt = 0; attempt < 8; attempt++) {
      const exists = await this.jobs.exist({ where: { short_code: shortCode } });
      if (!exists) break;
      shortCode = generateJobShortCode();
    }

    return this.jobs.save(
      this.jobs.create({
        job_number: jobNumber,
        order_number: dto.order_number?.trim() || null,
        short_code: shortCode,
        recipient_tracking_token: generateTrackingToken(),
        // Prefer Hebrew open/draft statuses. English `pending` is legacy — dispatch
        // normalizes to `נשלחה לשליחים`. Callers that intend courier fan-out MUST
        // also call `dispatchJob` after create (see dispatchJob JSDoc).
        status: dto.status ?? "טיוטה",
        job_type: dto.job_type ?? "delivery",
        pricing_type: dto.pricing_type ?? "fixed",
        matching_model: dto.matching_model ?? null,
        customer_id: customerId,
        customer_name: dto.customer_name ?? null,
        created_by: userId,
        pickup_address: dto.pickup_address ?? null,
        pickup_area: dto.pickup_area ?? null,
        pickup_lat: dto.pickup_lat ?? null,
        pickup_lng: dto.pickup_lng ?? null,
        pickup_contact_name: dto.pickup_contact_name ?? null,
        pickup_contact_phone: dto.pickup_contact_phone ?? null,
        pickup_instructions: dto.pickup_instructions ?? null,
        pickup_notes: dto.pickup_notes ?? null,
        pickup_ready: dto.pickup_ready ?? false,
        pickup_ready_at: dto.pickup_ready_at ? new Date(dto.pickup_ready_at) : null,
        dropoff_address: dto.dropoff_address ?? null,
        dropoff_area: dto.dropoff_area ?? null,
        dropoff_lat: dto.dropoff_lat ?? null,
        dropoff_lng: dto.dropoff_lng ?? null,
        dropoff_notes: dto.dropoff_notes ?? null,
        recipient_name: dto.recipient_name ?? null,
        recipient_phone: dto.recipient_phone ?? null,
        description: dto.description ?? null,
        payment: toNumeric(dto.payment) ?? "0",
        customer_price: toNumeric(dto.customer_price),
        suggested_courier_payment: toNumeric(dto.suggested_courier_payment),
        estimated_distance_km: toNumeric(dto.estimated_distance_km),
        fragile: dto.fragile ?? false,
        number_of_packages: dto.number_of_packages ?? null,
        vehicle_required: dto.vehicle_required ?? null,
        job_date: dto.job_date ?? null,
        job_time: dto.job_time ?? null,
        invoice_required: dto.invoice_required ?? false,
        couriers_needed: dto.couriers_needed ?? 1,
        matching_couriers_count: dto.matching_couriers_count ?? 0,
        pricing_snapshot:
          Object.keys(pricingSnapshot).length > 0 ? pricingSnapshot : null,
        guest_name: dto.guest_name ?? null,
        guest_phone: dto.guest_phone ?? null,
      }),
    );
  }

  async update(id: string, userId: string, roles: AppRole[], dto: UpdateJobDto) {
    const job = await this.getForUser(id, userId, roles);
    if (
      !roles.includes("admin") &&
      !roles.includes("manager") &&
      job.created_by !== userId
    ) {
      const customer = await this.findCustomerForUser(userId);
      if (!customer || job.customer_id !== customer.id) {
        throw new ForbiddenException("Cannot update this job");
      }
    }
    Object.assign(job, dto);
    if (dto.order_number !== undefined) {
      job.order_number = dto.order_number?.trim() || null;
    }
    if (dto.per_job_amount != null) {
      job.per_job_amount = String(dto.per_job_amount);
    }
    return this.jobs.save(job);
  }

  /** Owner/customer reprice + WhatsApp group resend while unassigned. */
  async repriceForUser(id: string, userId: string, roles: AppRole[], price: number) {
    if (!(price > 0)) {
      throw new BadRequestException("נא למלא מחיר תקין");
    }
    const job = await this.getForUser(id, userId, roles);
    if (job.selected_courier_id) {
      throw new ForbiddenException("כבר שובץ מוביל — לא ניתן לעדכן מחיר");
    }
    if (["הושלמה", "בוטלה", "פעילה"].includes(String(job.status))) {
      throw new ForbiddenException("לא ניתן לעדכן הזמנה במצב זה");
    }
    if (job.pricing_type === "quote_request") {
      throw new ForbiddenException("לא ניתן לעדכן מחיר לבקשת הצעות");
    }

    job.customer_price = String(price);
    job.payment = String(price);
    job.suggested_courier_payment = String(price);
    job.pricing_type = "fixed_price";
    job.status = "נשלחה לשליחים";
    if (!job.short_code) {
      let code = generateJobShortCode();
      for (let attempt = 0; attempt < 8; attempt++) {
        const exists = await this.jobs.exist({ where: { short_code: code } });
        if (!exists) break;
        code = generateJobShortCode();
      }
      job.short_code = code;
    }
    await this.jobs.save(job);
    const whatsapp = await this.whatsappDispatch.notifyJobDispatched(job);
    return { ok: true as const, whatsapp };
  }

  /** Admin/manager cancel — closes the job and clears pending courier offers. */
  async cancelByStaff(
    id: string,
    userId: string,
    roles: AppRole[],
    reason?: string | null,
  ) {
    if (!roles.includes("admin") && !roles.includes("manager")) {
      throw new ForbiddenException("Only staff can cancel jobs");
    }
    const job = await this.getForUser(id, userId, roles);
    if (job.status === "בוטלה" || job.status === "הושלמה") {
      throw new BadRequestException("Job is already closed");
    }

    const previousStatus = job.status;
    job.status = "בוטלה";
    await this.jobs.save(job);
    await this.cancelPendingOffersForJob(job.id);

    await this.statusLogs.save(
      this.statusLogs.create({
        entity_type: "job",
        entity_id: job.id,
        changed_by: userId,
        old_status: previousStatus,
        new_status: "בוטלה",
        note: reason?.trim() ? `ביטול אדמין: ${reason.trim()}` : "ביטול אדמין",
      }),
    );

    let outcome = await this.outcomes.findOne({ where: { job_id: job.id } });
    if (!outcome) {
      outcome = this.outcomes.create({
        job_id: job.id,
        courier_id: job.selected_courier_id,
      });
    }
    outcome.was_cancelled = true;
    outcome.cancellation_reason = reason?.trim() || "ביטול על ידי אדמין";
    if (!outcome.courier_id && job.selected_courier_id) {
      outcome.courier_id = job.selected_courier_id;
    }
    await this.outcomes.save(outcome);

    return job;
  }

  async listQuotes(jobId: string, userId: string, roles: AppRole[]) {
    await this.getForUser(jobId, userId, roles);
    return this.quotes.find({
      where: { job_id: jobId },
      order: { created_at: "DESC" },
    });
  }

  async submitQuote(
    jobId: string,
    userId: string,
    roles: AppRole[],
    dto: CreateQuoteDto,
  ) {
    if (!roles.includes("courier") && !roles.includes("admin")) {
      throw new ForbiddenException("Only couriers can submit quotes");
    }
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");

    const courier = await this.findCourierForUser(userId);
    if (!courier && !roles.includes("admin")) {
      throw new ForbiddenException("Courier profile required");
    }
    const courierId = courier?.id ?? dto.courier_id;
    if (!courierId) {
      throw new ForbiddenException("courier_id is required for admin-submitted quotes");
    }

    const saved = await this.quotes.save(
      this.quotes.create({
        job_id: jobId,
        courier_id: courierId,
        customer_id: job.customer_id,
        price: String(dto.price),
        note: dto.note ?? null,
        includes_invoice: dto.includes_invoice ?? false,
        is_final_price: dto.is_final_price ?? false,
        estimated_arrival_minutes: dto.estimated_arrival_minutes ?? null,
        estimated_delivery_minutes: dto.estimated_delivery_minutes ?? null,
        status: "pending",
      }),
    );

    if (
      job.pricing_type === "quote_request" &&
      !job.selected_quote_id &&
      (OPEN_STATUSES as readonly string[]).includes(job.status)
    ) {
      job.status = "יש שליחים שאישרו";
      await this.jobs.save(job);
    }

    return saved;
  }

  async selectQuote(
    jobId: string,
    quoteId: string,
    userId: string,
    roles: AppRole[],
  ) {
    const job = await this.getForUser(jobId, userId, roles);
    if (
      !roles.includes("admin") &&
      !roles.includes("manager") &&
      !roles.includes("business")
    ) {
      throw new ForbiddenException("Cannot select quotes");
    }
    const quote = await this.quotes.findOne({
      where: { id: quoteId, job_id: jobId },
    });
    if (!quote) throw new NotFoundException("Quote not found");

    quote.status = "selected";
    quote.selected_at = new Date();
    await this.quotes.save(quote);

    job.selected_quote_id = quote.id;
    job.selected_courier_id = quote.courier_id;
    job.status = "נבחר שליח";
    job.courier_step = "שליח אישר";
    job.delivery_status = job.delivery_status ?? "assigned";
    job.accepted_at = new Date();
    await this.jobs.save(job);

    await this.quotes
      .createQueryBuilder()
      .update(JobQuote)
      .set({ status: "rejected" })
      .where("job_id = :jobId AND id != :quoteId AND status = :pending", {
        jobId,
        quoteId,
        pending: "pending",
      })
      .execute();

    await this.cancelPendingOffersForJob(jobId);

    return { job, quote };
  }

  private async findCourierForUser(
    userId: string,
  ): Promise<Pick<Courier, "id"> | null> {
    const previewId = previewCourierId();
    if (previewId) {
      return this.couriers.findOne({ where: { id: previewId }, select: ["id"] });
    }
    return this.couriers.findOne({ where: { user_id: userId }, select: ["id"] });
  }

  private async attachJobChatMeta<T extends { id: string; customer_id?: string | null }>(jobs: T[]) {
    if (jobs.length === 0) return jobs;
    const jobIds = jobs.map((j) => j.id);
    const customerIds = [...new Set(jobs.map((j) => j.customer_id).filter(Boolean))] as string[];
    const [convs, customers] = await Promise.all([
      this.conversations.find({
        where: { kind: "courier_business", job_id: In(jobIds) },
        select: ["id", "job_id"],
      }),
      customerIds.length
        ? this.customers.find({ where: { id: In(customerIds) }, select: ["id", "phone"] })
        : Promise.resolve([]),
    ]);
    const convByJob = new Map(convs.map((c) => [c.job_id, c.id]));
    const phoneByCustomer = new Map(customers.map((c) => [c.id, c.phone]));
    return jobs.map((j) => ({
      ...j,
      conversation_id: convByJob.get(j.id) ?? null,
      customer_phone: j.customer_id ? phoneByCustomer.get(j.customer_id) ?? null : null,
    }));
  }

  private async attachCouriers(jobs: Job[]) {
    const ids = [...new Set(jobs.map((j) => j.selected_courier_id).filter(Boolean))] as string[];
    if (ids.length === 0) {
      return jobs.map((j) => ({ ...j, couriers: null }));
    }
    const rows = await this.couriers.find({
      where: { id: In(ids) },
      select: ["id", "full_name", "vehicle_type", "vehicle_label", "last_lat", "last_lng", "avatar_url"],
    });
    const byId = new Map(rows.map((c) => [c.id, c]));
    return jobs.map((j) => {
      const c = j.selected_courier_id ? byId.get(j.selected_courier_id) : undefined;
      return {
        ...j,
        couriers: c
          ? {
              full_name: c.full_name,
              vehicle_type: c.vehicle_type,
              vehicle_label: c.vehicle_label,
              last_lat: c.last_lat,
              last_lng: c.last_lng,
              avatar_url: c.avatar_url,
            }
          : null,
      };
    });
  }

  private async findCustomerForUser(
    userId: string,
  ): Promise<Pick<Customer, "id" | "name"> | null> {
    const previewId = previewCustomerId();
    if (previewId) {
      return this.customers.findOne({
        where: { id: previewId },
        select: ["id", "name"],
      });
    }
    return this.customers.findOne({
      where: { user_id: userId },
      select: ["id", "name"],
    });
  }

  private async requireCourier(userId: string): Promise<Courier> {
    const previewId = previewCourierId();
    const courier = previewId
      ? await this.couriers.findOne({ where: { id: previewId } })
      : await this.couriers.findOne({ where: { user_id: userId } });
    if (!courier) throw new ForbiddenException("Courier profile required");
    return courier;
  }

  async listCourierOffers(userId: string, response?: string) {
    const courier = await this.requireCourier(userId);
    const offers = await this.offers.find({
      where: response
        ? { courier_id: courier.id, response }
        : { courier_id: courier.id },
      order: { sent_at: "DESC" },
      take: 200,
    });
    if (offers.length === 0) return [];
    const jobs = await this.jobs.find({
      where: { id: In(offers.map((o) => o.job_id)) },
    });
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    return offers.map((o) => ({ ...o, jobs: jobMap.get(o.job_id) ?? null }));
  }

  async listCourierDeclines(userId: string) {
    const courier = await this.requireCourier(userId);
    return this.declines.find({
      where: { courier_id: courier.id },
      order: { declined_at: "DESC" },
    });
  }

  async addCourierDecline(userId: string, jobId: string) {
    const courier = await this.requireCourier(userId);
    const existing = await this.declines.findOne({
      where: { courier_id: courier.id, job_id: jobId },
    });
    if (existing) return existing;
    return this.declines.save(
      this.declines.create({ courier_id: courier.id, job_id: jobId }),
    );
  }

  async removeCourierDecline(userId: string, jobId: string) {
    const courier = await this.requireCourier(userId);
    await this.declines.delete({ courier_id: courier.id, job_id: jobId });
    return { ok: true as const };
  }

  async listOpenQuoteJobs(userId: string) {
    await this.requireCourier(userId);
    return this.jobs.find({
      where: {
        pricing_type: "quote_request",
        selected_quote_id: IsNull(),
        status: In([...OPEN_STATUSES]),
      },
      order: { created_at: "DESC" },
      take: 200,
    });
  }

  async listCourierQuotes(userId: string, jobIds: string[]) {
    const courier = await this.requireCourier(userId);
    if (jobIds.length === 0) return [];
    return this.quotes.find({
      where: { courier_id: courier.id, job_id: In(jobIds) },
    });
  }

  private isClaimableStatus(status: string) {
    return statusIsClaimable(status);
  }

  /** Cancel sibling pending offers + notify business/WhatsApp after a successful claim/accept. */
  private async afterCourierAssigned(
    job: Job,
    courier: Courier,
    acceptedOfferId?: string,
  ) {
    const qb = this.offers
      .createQueryBuilder()
      .update(OfferEvent)
      .set({ response: "cancelled", responded_at: new Date() })
      .where("job_id = :jobId AND response = :pending", {
        jobId: job.id,
        pending: "pending",
      });
    if (acceptedOfferId) {
      qb.andWhere("id != :offerId", { offerId: acceptedOfferId });
    }
    await qb.execute();

    if (job.customer_id) {
      try {
        await this.businessNotifications.save(
          this.businessNotifications.create({
            business_id: job.customer_id,
            job_id: job.id,
            kind: "courier_accepted",
            title: "שליח אישר את המשלוח",
            body: `${courier.full_name} לקח את ${job.job_number}`,
            link: `/business/order/${job.id}`,
          }),
        );
      } catch (e) {
        this.logger.warn(
          `afterCourierAssigned business notify failed for ${job.id}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }

    void this.whatsappDispatch
      .notifyJobTaken(job, courier.full_name)
      .catch((e) =>
        this.logger.warn(
          `afterCourierAssigned whatsapp taken notify failed for ${job.id}: ${
            e instanceof Error ? e.message : e
          }`,
        ),
      );

    await this.ensureCourierBusinessConversation(job, courier.id);
  }

  /** Idempotent: one courier_business thread per job. Skip (don't fail claim) if no business. */
  private async ensureCourierBusinessConversation(job: Job, courierId: string) {
    if (!job.customer_id) return;
    try {
      const existing = await this.conversations.findOne({
        where: { kind: "courier_business", job_id: job.id },
      });
      if (existing) {
        existing.courier_id = courierId;
        existing.business_id = job.customer_id;
        existing.hidden_from_participants = false;
        await this.conversations.save(existing);
        return;
      }
      await this.conversations.save(
        this.conversations.create({
          kind: "courier_business",
          courier_id: courierId,
          business_id: job.customer_id,
          job_id: job.id,
          subject: job.job_number ? `#${job.job_number}` : null,
          last_message_at: new Date(),
          last_message_preview: null,
          unread_admin: 0,
          unread_business: 0,
          unread_courier: 0,
          unread_guest: 0,
          hidden_from_participants: false,
        }),
      );
    } catch (e) {
      this.logger.warn(
        `ensureCourierBusinessConversation failed for ${job.id}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  private async hideCourierBusinessConversation(jobId: string) {
    try {
      await this.conversations.update(
        { kind: "courier_business", job_id: jobId },
        { hidden_from_participants: true },
      );
    } catch (e) {
      this.logger.warn(
        `hideCourierBusinessConversation failed for ${jobId}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  }

  async claimJob(userId: string, jobId: string, _source = "app") {
    const courier = await this.requireCourier(userId);
    if (courier.courier_status !== "פעיל" || courier.is_paused) {
      return { ok: false as const, reason: "not_active" };
    }

    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");

    if (job.selected_courier_id && job.selected_courier_id !== courier.id) {
      return { ok: false as const, reason: "taken" };
    }
    if (!this.isClaimableStatus(job.status)) {
      return { ok: false as const, reason: "closed" };
    }

    const result = await this.jobs.update(
      {
        id: jobId,
        selected_courier_id: IsNull(),
        status: In([...CLAIMABLE_STATUSES]),
      },
      {
        selected_courier_id: courier.id,
        status: "נבחר שליח",
        delivery_status: job.delivery_status ?? "assigned",
        courier_step: "שליח אישר",
        accepted_at: job.accepted_at ?? new Date(),
      },
    );

    if (!result.affected) {
      return { ok: false as const, reason: "taken" };
    }

    await this.afterCourierAssigned(job, courier);
    return { ok: true as const, job_id: jobId };
  }

  async respondToOffer(userId: string, offerId: string, response: "accepted" | "declined") {
    const courier = await this.requireCourier(userId);
    if (courier.courier_status !== "פעיל" || courier.is_paused) {
      return { ok: false as const, reason: "not_active" };
    }

    const offer = await this.offers.findOne({
      where: { id: offerId, courier_id: courier.id },
    });
    if (!offer) throw new NotFoundException("Offer not found");

    const job = await this.jobs.findOne({ where: { id: offer.job_id } });
    if (!job) {
      if (offer.response === "pending") {
        offer.response = "cancelled";
        offer.responded_at = new Date();
        await this.offers.save(offer);
      }
      return { ok: false as const, reason: "closed" };
    }

    if (response === "declined") {
      if (offer.response === "pending") {
        offer.response = "declined";
        offer.responded_at = new Date();
        await this.offers.save(offer);
      }
      return { ok: true as const, response: "declined" as const };
    }

    if (job.pricing_type === "quote_request") {
      throw new ForbiddenException("Job is a quote request");
    }
    if (job.selected_courier_id && job.selected_courier_id !== courier.id) {
      if (offer.response === "pending") {
        offer.response = "cancelled";
        offer.responded_at = new Date();
        await this.offers.save(offer);
      }
      return { ok: false as const, reason: "taken" };
    }
    if (!this.isClaimableStatus(job.status)) {
      if (offer.response === "pending") {
        offer.response = "cancelled";
        offer.responded_at = new Date();
        await this.offers.save(offer);
      }
      return { ok: false as const, reason: "closed" };
    }

    const result = await this.jobs.update(
      {
        id: job.id,
        selected_courier_id: IsNull(),
        status: In([...CLAIMABLE_STATUSES]),
      },
      {
        selected_courier_id: courier.id,
        status: "נבחר שליח",
        delivery_status: job.delivery_status ?? "assigned",
        courier_step: "שליח אישר",
        accepted_at: job.accepted_at ?? new Date(),
      },
    );

    if (!result.affected) {
      if (offer.response === "pending") {
        offer.response = "cancelled";
        offer.responded_at = new Date();
        await this.offers.save(offer);
      }
      return { ok: false as const, reason: "taken" };
    }

    offer.response = "accepted";
    offer.responded_at = new Date();
    await this.offers.save(offer);

    await this.afterCourierAssigned(job, courier, offerId);

    return { ok: true as const, response: "accepted" as const, job_id: job.id, courier_id: courier.id };
  }

  async countCourierActiveJobs(userId: string) {
    const courier = await this.requireCourier(userId);
    return this.jobs.count({
      where: {
        selected_courier_id: courier.id,
        status: Not(In(["הושלמה", "בוטלה"])),
      },
    });
  }

  async activateCouriersForUpcomingScheduledJobs() {
    if (this.scheduledGoOnlineRunning) {
      return { ok: true as const, activated: 0, reminded: 0, skipped: true };
    }
    this.scheduledGoOnlineRunning = true;
    try {
      const rows = await this.jobs.find({
        where: {
          selected_courier_id: Not(IsNull()),
          status: Not(In(["הושלמה", "בוטלה"])),
          scheduled_online_notified_at: IsNull(),
        },
        take: 400,
      });
      const due = rows.filter((job) => isWithinScheduledGoOnlineWindow(job));
      let activated = 0;
      let reminded = 0;
      for (const job of due) {
        job.scheduled_online_notified_at = new Date();
        await this.jobs.save(job);
        const courierId = job.selected_courier_id;
        if (!courierId) continue;
        const courier = await this.couriers.findOne({ where: { id: courierId } });
        if (!courier || courier.courier_status !== "פעיל" || courier.is_paused) {
          continue;
        }
        if (!courier.accepting_jobs) {
          courier.accepting_jobs = true;
          await this.couriers.save(courier);
          activated += 1;
        }
        const when = [job.job_date, job.job_time].filter(Boolean).join(" ") || "בקרוב";
        const title = "משלוח מתוזמן מתחיל בקרוב";
        const body = `יש לך משלוח ב-${when}. עברת לזמין אוטומטית — היכנסו לאפליקציה.`;
        try {
          await this.offerPush.notifyCourier(courier.id, {
            title,
            body,
            url: "/courier/active",
            tag: `goi-scheduled-${job.id}`,
          });
          reminded += 1;
        } catch (e) {
          this.logger.warn(
            `scheduled go-online push failed job=${job.id}`,
            e instanceof Error ? e.message : e,
          );
        }
        if (courier.whatsapp_phone && this.greenApi.isConfigured()) {
          try {
            await this.greenApi.sendText(
              courier.whatsapp_phone,
              `Goi: ${body}`,
            );
          } catch (e) {
            this.logger.warn(
              `scheduled go-online WhatsApp failed job=${job.id}`,
              e instanceof Error ? e.message : e,
            );
          }
        }
      }
      return { ok: true as const, activated, reminded };
    } catch (e) {
      this.logger.error(
        "scheduled go-online tick failed",
        e instanceof Error ? e.stack : e,
      );
      throw e;
    } finally {
      this.scheduledGoOnlineRunning = false;
    }
  }

  async listOpenBroadcastJobs(userId: string) {
    await this.requireCourier(userId);
    const today = new Date().toISOString().slice(0, 10);
    return this.jobs.find({
      where: [
        {
          selected_courier_id: IsNull(),
          status: "נשלחה לשליחים",
          pricing_type: Not("quote_request"),
          job_date: IsNull(),
        },
        {
          selected_courier_id: IsNull(),
          status: "נשלחה לשליחים",
          pricing_type: Not("quote_request"),
          job_date: MoreThanOrEqual(today),
        },
      ],
      order: { created_at: "DESC" },
      take: 200,
    });
  }

  async getByTrackingToken(token: string) {
    const job = await this.jobs.findOne({
      where: { recipient_tracking_token: token },
    });
    if (!job) throw new NotFoundException("Tracking token not found");
    return {
      id: job.id,
      job_number: job.job_number,
      status: job.status,
      delivery_status: job.delivery_status,
      pickup_address: job.pickup_address,
      dropoff_address: job.dropoff_address,
      recipient_name: job.recipient_name,
      courier_step: job.courier_step,
      picked_up_at: job.picked_up_at,
      delivered_at: job.delivered_at,
    };
  }

  private async assertCanRead(job: Job, userId: string, roles: AppRole[]) {
    if (roles.includes("admin") || roles.includes("manager")) return;

    if (roles.includes("business") || roles.includes("customer")) {
      const customer = await this.findCustomerForUser(userId);
      if (customer && job.customer_id === customer.id) return;
    }

    if (roles.includes("courier")) {
      const courier = await this.findCourierForUser(userId);
      if (
        courier &&
        (job.selected_courier_id === courier.id ||
          (OPEN_STATUSES as readonly string[]).includes(job.status))
      ) {
        return;
      }
    }

    throw new ForbiddenException("Cannot access this job");
  }

  async listCourierActiveJobs(userId: string) {
    const courier = await this.requireCourier(userId);
    const rows = await this.jobs.find({
      where: {
        selected_courier_id: courier.id,
        status: Not(In(["הושלמה", "בוטלה"])),
      },
      order: { job_date: "ASC" },
    });
    const jobIds = rows.map((j) => j.id);
    const outcomes = jobIds.length
      ? await this.outcomes.find({ where: { job_id: In(jobIds) } })
      : [];
    const outcomeByJob = new Map(outcomes.map((o) => [o.job_id, o]));
    return this.attachJobChatMeta(
      rows.map((j) => ({
        ...j,
        job_outcomes: outcomeByJob.get(j.id) ? [outcomeByJob.get(j.id)] : [],
      })),
    );
  }

  async courierUpdateProgress(userId: string, jobId: string, step: string) {
    const courier = await this.requireCourier(userId);
    const job = await this.jobs.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException("Job not found");
    if (job.selected_courier_id !== courier.id) {
      throw new ForbiddenException("Not your job");
    }
    const now = new Date();
    job.courier_step = step;
    const statusMap: Record<string, string> = {
      "בדרך לאיסוף": "heading_to_pickup",
      "אספתי": "picked_up",
      "נמסר": "delivered",
    };
    if (statusMap[step]) job.delivery_status = statusMap[step];
    if (step === "אספתי") {
      job.picked_up_at = now;
      let outcome = await this.outcomes.findOne({ where: { job_id: jobId } });
      if (!outcome) outcome = this.outcomes.create({ job_id: jobId, courier_id: courier.id });
      outcome.picked_up_at = now;
      outcome.courier_id = courier.id;
      await this.outcomes.save(outcome);
    }
    if (step === "נמסר") {
      job.delivered_at = now;
      job.status = "הושלמה";
      let outcome = await this.outcomes.findOne({ where: { job_id: jobId } });
      if (!outcome) outcome = this.outcomes.create({ job_id: jobId, courier_id: courier.id });
      outcome.delivered_at = now;
      outcome.courier_id = courier.id;
      await this.outcomes.save(outcome);
      await this.hideCourierBusinessConversation(jobId);
    }
    await this.jobs.save(job);
    if (step === "נמסר") {
      try {
        await this.referralCommissions.creditForCompletedJob({
          jobId: job.id,
          selectedCourierId: job.selected_courier_id,
          customerId: job.customer_id,
        });
      } catch (err) {
        this.logger.error(
          `Referral commission failed for job ${job.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
    await this.statusLogs.save(
      this.statusLogs.create({
        entity_type: "job",
        entity_id: jobId,
        old_status: null,
        new_status: step,
        note: null,
      }),
    );
    return { ok: true as const };
  }

  async listJobStops(jobId: string, userId: string, roles: AppRole[]) {
    await this.getForUser(jobId, userId, roles);
    return this.jobStops.find({
      where: { job_id: jobId },
      order: { stop_order: "ASC" },
    });
  }

  async updateJobStop(
    stopId: string,
    userId: string,
    roles: AppRole[],
    status: "arrived" | "done",
  ) {
    const stop = await this.jobStops.findOne({ where: { id: stopId } });
    if (!stop) throw new NotFoundException("Stop not found");
    await this.getForUser(stop.job_id, userId, roles);
    const now = new Date();
    if (status === "arrived") {
      stop.status = "arrived";
      stop.arrived_at = now;
    } else {
      stop.status = "done";
      stop.done_at = now;
    }
    return this.jobStops.save(stop);
  }

  async listCourierJobs(courierId: string, limit = 50) {
    return this.jobs.find({
      where: { selected_courier_id: courierId },
      order: { created_at: "DESC" },
      take: limit,
      select: ["job_number", "job_type", "status", "payment", "created_at"],
    });
  }
}
