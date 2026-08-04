import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { In, IsNull, MoreThanOrEqual, Not, Repository } from "typeorm";
import { Courier } from "../accounts/entities/courier.entity";
import { Customer } from "../accounts/entities/customer.entity";
import { previewCourierId, previewCustomerId } from "../auth/auth-als";
import type { AppRole } from "../auth/auth.types";
import { OfferPushService } from "../push/offer-push.service";
import { WhatsappDispatchService } from "../whatsapp/whatsapp-dispatch.service";
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

/**
 * Statuses under which a job is still "open" to couriers (not yet assigned).
 * Includes the legacy production Hebrew values alongside the generic ones
 * used by freshly-created Nest jobs, since both may coexist during migration.
 */
const OPEN_STATUSES = [
  "pending",
  "awaiting_quotes",
  "open",
  "offered",
  "נשלחה לשליחים",
  "ממתינה לתגובות",
  "יש שליחים שאישרו",
];

function generateTrackingToken(): string {
  return randomBytes(16).toString("hex");
}

const OFFER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

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
    private readonly whatsappDispatch: WhatsappDispatchService,
    private readonly offerPush: OfferPushService,
  ) {}

  /**
   * Open a job to couriers: Hebrew open status + offer_events fan-out,
   * then best-effort WhatsApp group + Web Push notifications.
   * Inbox visibility never depends on external channel success.
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
      return this.jobs.find({
        where: status ? { status } : {},
        order: { created_at: "DESC" },
        take: limit,
      });
    }

    if (roles.includes("business") || roles.includes("customer")) {
      const customer = await this.findCustomerForUser(userId);
      if (!customer) return [];
      return this.jobs.find({
        where: status
          ? { customer_id: customer.id, status }
          : { customer_id: customer.id },
        order: { created_at: "DESC" },
        take: limit,
      });
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
      return [...byId.values()].slice(0, limit);
    }

    return [];
  }

  async getForUser(id: string, userId: string, roles: AppRole[]) {
    const job = await this.jobs.findOne({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");
    await this.assertCanRead(job, userId, roles);
    return job;
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

    return this.jobs.save(
      this.jobs.create({
        job_number: jobNumber,
        recipient_tracking_token: generateTrackingToken(),
        status: dto.status ?? "pending",
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
    if (dto.per_job_amount != null) {
      job.per_job_amount = String(dto.per_job_amount);
    }
    return this.jobs.save(job);
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
      ["נשלחה לשליחים", "ממתינה לתגובות", ...OPEN_STATUSES].includes(job.status)
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
    return ["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו", ...OPEN_STATUSES].includes(status);
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
        status: In(["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו"]),
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
        status: In(["נשלחה לשליחים", "ממתינה לתגובות", "יש שליחים שאישרו"]),
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

    await this.offers
      .createQueryBuilder()
      .update(OfferEvent)
      .set({ response: "cancelled", responded_at: new Date() })
      .where("job_id = :jobId AND id != :offerId AND response = :pending", {
        jobId: job.id,
        offerId,
        pending: "pending",
      })
      .execute();

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
          OPEN_STATUSES.includes(job.status))
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
    return rows.map((j) => ({
      ...j,
      job_outcomes: outcomeByJob.get(j.id) ? [outcomeByJob.get(j.id)] : [],
    }));
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
    }
    await this.jobs.save(job);
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
